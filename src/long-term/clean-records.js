
const docdb = require("../utils/docdb")
const config = require("../../.config/ade-import")
const ADE_DATABASE = config.ADE_DATABASE


const cleanRecords = async settings => {

    let { records, user } = settings
    const SCHEMA = user.submit.schema  

    // console.log(`LONG-TERM: Clean Records: ${records.length} items started`)

    let commands = records
        .map( s => ({
                        updateOne: {
                            filter: {
                                id: s.id
                            },
                            update: {
                                $unset:{
                                    Source: "",
                                    path: ""
                                }
                            },

                            upsert: true
                        }
    }))

    console.log(`LONG-TERM: Clean Records: update ${commands.length} items in ${SCHEMA}.labels`)
    
    await docdb.bulkWrite({
                db: ADE_DATABASE, //"ADE",
                collection: `${SCHEMA}.labels`,
                commands
            })
    
         
    // console.log(`LONG-TERM: Clean Records: done`)
    
}

module.exports = cleanRecords