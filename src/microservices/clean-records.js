const { extend } = require("lodash")
const { AmqpManager, Middlewares } = require('@molfar/amqp-client');

const cleanRecords = require("../long-term/clean-records")

const config = require("../../.config/ade-import").rabbitmq.TEST
const STAGE_NAME        = "Clean Records"
const SERVICE_NAME      = `${STAGE_NAME} microservice`
const DATA_CONSUMER     = config.consumer.cleanRecords
const DATA_PUBLISHER    = config.publisher.autoAccept
const REPORT_PUBLISHER  = config.publisher.submitExaminationReport


const processData = async (err, msg, next) => {
    
    try {
        if(msg.content.records){
            let result = await cleanRecords(msg.content)
        }
        next()
    } catch (e) {
        console.log(e.toString(), e.stack)
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
            next()
        })

        .use(processData)

        .use((err, msg, next) => {
            if(err){
                reportPublisher.send({
                    requestId: msg.content.requestId,
                    stage: STAGE_NAME, 
                    status: "error",
                    message: msg.content,
                    error: err.toString()
                })
            }
            next()
        })
        .use(Middlewares.Error.Log)
        .use(Middlewares.Error.BreakChain)


        .use((err, msg, next) => {
            
            dataPublisher.send(msg.content)
            console.log("Request:", msg.content.requestId, " done")
            reportPublisher.send({
                requestId: msg.content.requestId,
                stage: STAGE_NAME, 
                status: "done"
            })
            msg.ack()
        
        })

        .start()

    console.log(`${SERVICE_NAME} started`)
    
}

run()