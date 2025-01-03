const { extend, isArray } = require("lodash")
const uuid = require("uuid").v4
const axios = require("axios")
const docdb = require("../utils/docdb")

const config = require("../../.config/ade-import")
const AI_SEGMENTATION_API = config.AI_SEGMENTATION_API
const ADE_DATABASE = config.ADE_DATABASE
const CLINIC_DATABASE= config.CLINIC_DATABASE

const transformAI2v2 = data => {

    let segments = [
        { ai: "s1", v2: "S1" },
        { ai: "s2", v2: "S2" },
        { ai: "unsegmentable", v2: "unsegmentable" },
        { ai: "s3", v2: "S3" },
        { ai: "s4", v2: "S4" }
    ]

    let res = {}

    if (data.segmentation) {
        segments.forEach(s => {
            if (data.segmentation[s.ai]) {
                res[s.v2] = data.segmentation[s.ai].map(v => [
                    v.start.toFixed(3),
                    v.end.toFixed(3),
                    (["s3", "s4"].includes(s.ai)) ? v.freq_lower.toFixed(3) : '0.000',
                    (["s3", "s4"].includes(s.ai)) ? v.freq_upper.toFixed(3) : '22050.000'
                ])
            }
        })
    }

    res.id = data.id
    res.v2 = true
    res.heart_rate = data.heart_rate
    res.murmur_present = data.murmur_present
    res.quality = data.quality
    res.afib_present = data.afib_present

    return res
}



const getAISegmentation = async (settings, publisher) => {

    let { records, requestId } = settings

    if (!records) throw new Error("AI segmentation error: records not defined")

    records = (isArray(records)) ? records : [records]

    let result = []
    let i = 0
    for (let r of records) {
        i++

        console.log("LONG-TERM: getAISegmentation for ", r.id, r["Body Spot"], r.model)



        let segmentation = {
            id: uuid(),
            recordId: r.id,
            createdAt: new Date(),
            user: {
                name: "AI"
            },
        }

        try {

            let query

            if (r.Source && r.Source.url) {

                query = {
                    url: r.Source.url
                }

                let response = await axios({
                    method: "POST",
                    url: AI_SEGMENTATION_API,
                    data: query
                })

                let data = response.data

                let id = uuid()

                // data = transformAI2v2(data)

                data.id = id
                segmentation = extend({},
                    segmentation, {
                        id,
                        record: extend({ id: r.id }, query),
                        data
                    }
                )
            }

        } catch (e) {

            segmentation = extend({}, segmentation, {
                error: `${e.toString()}: ${JSON.stringify(e.response.data, null, " ")}`
            })

        }

        result.push(segmentation)

        publisher.send({
            requestId: requestId,
            stage: "AI Segmentation",
            status: "process",
            message: `${r.id}, ${r["Body Spot"]}, ${r.model}`,
            progress: Number.parseFloat((100 * i / records.length).toFixed(2))
        })

    }
    return result
}

const updateAISegmentation = async (settings, publisher) => {


    let { records, user, requestId, examinationId, sourceRecords } = settings

    const SCHEMA = user.submit.schema

    console.log("sourceRecords", sourceRecords)

    ///////////////////// debug /////////////////////////    
    // records = records.slice(0,3)
    // console.log(records)
    /////////////////////////////////////////////////////

    let segmentations = await getAISegmentation({ records, requestId }, publisher)

    try {

        sourceRecords = sourceRecords.map( (r, index) => {
            let s = segmentations[index]
            if(!s.error && s.data){
                r.quality = s.data.quality
            } 
            return r
        })

        let commands = [
            {
                updateOne: {
                    filter: {
                        uuid: examinationId
                    },
                    update: {
                        $set: {
                            recordings: sourceRecords,
                        }
                    },
                    upsert: true
                }
            }
        ]

        await docdb.bulkWrite({
            db: CLINIC_DATABASE, //"ADE",
            collection: `sparrow-clinic.forms`,
            commands
        })



        commands = segmentations
            .filter(s => !s.error)
            .map(s => ({
                updateOne: {
                    filter: {
                        id: s.recordId
                    },
                    update: {
                        $set: {
                            aiSegmentation: s.data,
                        }
                    },
                    upsert: true
                }
            }))

        
        console.log(`LONG-TERM: updateAISegmentation: update ${commands.length} items in ${SCHEMA}.labels`)


        if (segmentations.length > commands.length) {
            console.log(`LONG-TERM: updateAISegmentation: no segmentation for`, segmentations.filter(s => s.error))
        }

        await docdb.bulkWrite({
            db: ADE_DATABASE, //"ADE",
            collection: `${SCHEMA}.labels`,
            commands
        })



    } catch (e) {
        console.log(e.toString(), e.stack)
        throw e
    }

}




module.exports = {
    // getAISegmentation,
    // transformAI2v2,
    updateAISegmentation
}