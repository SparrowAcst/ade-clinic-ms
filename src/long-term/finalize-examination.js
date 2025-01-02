const { extend, isArray } = require("lodash")
const docdb = require("../utils/docdb")

const acceptExamination = async (examination, SCHEMA) => {

    console.log(`LONG-TERM: autoaccept: for ${examination.patientId} on ${SCHEMA} - ACCEPT`)

    console.log(`LONG-TERM: autoaccept: update ${SCHEMA}.examinations`)

    await docdb.updateOne({
        db: "TEST", //"ADE",
        collection: `${SCHEMA}.examinations`,
        filter: {
            id: examination.id
        },
        data: {
            state: "accepted",
            updatedAt: new Date(),
            updatedBy: "AUTO ACCEPT"
        }
    })

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const autoAccept = async settings => {

    let { examinationId, user } = settings
    const SCHEMA = user.submit.schema

    try {

   
        const pipeline = [{
                $match: {
                    id: examinationId,
                },
            }
        ]

        let examination = await docdb.aggregate({
            db: "TEST", //"ADE",
            collection: `${SCHEMA}.examinations`,
            pipeline
        })

        examination = examination[0]

        
        if(examination) {

            examination.records = examination.records
                                    .filter( r => availableBodySpots.includes(r["Body Spot"]))
                                    .map( r => ({
                                        id: r.id,
                                        qty: (r.aiSegmentation) ? r.aiSegmentation.quality : undefined
                                    })) 
            
            
            if (checkAcceptanceCriteria(examination.forms) && checkRecordsQuality(examination.records)) {
                await acceptExamination(examination, SCHEMA)
            } else {
                console.log(`LONG-TERM: autoaccept: for ${examinationId} on ${SCHEMA} - NO ACCEPTANCE CRITERIA`)
            }    
        }

        // console.log(`LONG-TERM: autoaccept: for ${examinationId} on ${SCHEMA} done`)

    } catch (e) {
        console.log(`LONG-TERM: autoaccept: for ${examinationId} on ${SCHEMA} error`, e.toString(), e.stack)
    }

}


module.exports = autoAccept