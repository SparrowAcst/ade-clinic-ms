const { extend } = require("lodash")
const { AmqpManager, Middlewares } = require('@molfar/amqp-client');

const sync = require("../long-term/sync-one-examination")

const config = require("../../.config/ade-import").rabbitmq.TEST
const STAGE_NAME        = "Sync Examination"
const SERVICE_NAME      = `${STAGE_NAME} microservice`
const DATA_CONSUMER     = config.consumer.syncExamination
const DATA_PUBLISHER    = config.publisher.migrateRecords
const REPORT_PUBLISHER  = config.publisher.submitExaminationReport


const processData = async (err, msg, next) => {
    try {
        let result = await sync(msg.content)
        msg.content = extend( msg.content, result )
        next()
    } catch (e) {
        console.log(e.toString(). e.stack)
        throw e
    }    
}

const run = async () => {

    console.log(`Configure ${SERVICE_NAME}`)
    console.log("Data Consumer:", DATA_CONSUMER)
    console.log("Data Publisher:", DATA_PUBLISHER)
    console.log("Report Publisher:", REPORT_PUBLISHER)

    const consumer = await AmqpManager.createConsumer(DATA_CONSUMER)

    const dataPublisher = await AmqpManager.createPublisher(DATA_PUBLISHER)
    dataPublisher.use(Middlewares.Json.stringify)

    const reportPublisher = await AmqpManager.createPublisher(REPORT_PUBLISHER)
    reportPublisher.use(Middlewares.Json.stringify)

    await consumer
        .use(Middlewares.Json.parse)

        .use((err, msg, next) => {
            console.log("Request:", msg.content.requestId, " start")
            reportPublisher.send({
                requestId: msg.content.requestId,
                stage: STAGE_NAME, 
                status: "start"
            })
            msg.ack()
            next()
        })

        .use(processData)

        .use((err, msg, next) => {
            dataPublisher.send(msg.content)
            reportPublisher.send({
                requestId: msg.content.requestId,
                stage: STAGE_NAME, 
                status: "done"
            })
            console.log("Request:", msg.content.requestId, " done")
        })

        .start()

    console.log(`${SERVICE_NAME} started`)
    
}

run()