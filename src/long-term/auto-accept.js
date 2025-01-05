const { extend, isArray, keys } = require("lodash")
const docdb = require("../utils/docdb")

const config = require("../../.config/ade-import")
const ADE_DATABASE = config.ADE_DATABASE
const CLINIC_DATABASE = config.CLINIC_DATABASE


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let patientRules = [

    d => {
        if (d.heart_failure_choice && d.heart_failure_choice == "Yes") return `Heart Failure: <b>${d.heart_failure_choice}</b>`
        return false
    },

    d => {
        if (d.atrial_fibrillation_definition && d.atrial_fibrillation_definition == "Present") return `At the moment of heart sound recording Atrial fibrillation is: <b>${d.atrial_fibrillation_definition}</b>`
        return false
    },

    d => {
        if (d.af_definition && d.af_definition == "Present") return `At the moment of heart sound recording, AF is: <b>${d.af_definition}</b>`
        return false
    },

    d => {
        if (d.pulmonary_hypertension && d.pulmonary_hypertension == "Yes") return `Pulmonary hypertension: <b>${d.pulmonary_hypertension}</b>`
        return false
    },

    d => {
        if (d.pulmonary_embolism && ["acute", "chronic", "acute in the past"].includes(d.pulmonary_embolism)) return `Pulmonary Embolism: <b>${d.pulmonary_embolism}</b>`
        return false
    },

    d => {
        if (d.cardiomyopathy_type && ["Hypertrophic Obstructive", "Hypertrophic Non-Obstructive"].includes(d.cardiomyopathy_type)) return `Cardiomyopathy Type: <b>${d.cardiomyopathy_type}</b>`
        return false
    },
]

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let echoRules = [

    d => {
        if (d.aortic_dissection && ["DeBakey I", "DeBakey II", "DeBakey III"].includes(d.aortic_dissection)) return `Aortic dissection: <b>${d.aortic_dissection}</b>`
        return false
    },

    d => {
        if (d.ef && d.ef <= 40) return `EF (apical access, 4-chamber position, Simpson algorithm): <b>${d.ef}</b>`
        return false
    },

    d => {
        if (d.mitral_regurgitation_stage && [
                "B Progressive",
                "C1 Asymptomatic severe (LVEF > 60% and LVESD < 40mm)",
                "C2 Asymptomatic severe (LVEF < 60% and LVESD > 40mm)",
                "D Symptomatic severe",
                "Undefined",
                "Acute"
            ].includes(d.mitral_regurgitation_stage)) return `Mitral regurgitation stage: <b>${d.mitral_regurgitation_stage}</b>`
        return false
    },

    d => {
        if (d.mitral_stenosis_stage && [
                "B Progressive MS",
                "C Asymptomatic severe MS",
                "D Symptomatic severe MS"
            ].includes(d.mitral_stenosis_stage)) return `Mitral stenosis stage: <b>${d.mitral_stenosis_stage}</b>`
        return false
    },

    d => {
        if (d.aortic_regurgitation_stage && [
                "B Progressive Moderate AR",
                "C1 Asymptomatic severe AR, LVEF ≥ 50%, LVESD ≤ 50mm",
                "C2 Asymptomatic severe AR, LVEF < 50%, LVESD > 50mm",
                "D Symptomatic severe AR"
            ].includes(d.aortic_regurgitation_stage)) return `Aortic regurgitation stage: <b>${d.aortic_regurgitation_stage}</b>`
        return false
    },

    d => {
        if (d.aortic_stenosis_stage && [
                "B - Progressive moderate",
                "C1 - Asymptomatic severe with normal EF",
                "C2 - Asymptomatic severe with low EF",
                "D1 - Symptomatic severe High gradient",
                "D2 - Symptomatic severe LG reduced EF",
                "D3 - Symptomatic severe LG normal EF"
            ].includes(d.aortic_stenosis_stage)) return `Aortic stenosis stage: <b>${d.aortic_stenosis_stage}</b>`
        return false
    },

    d => {
        if (d.tricuspid_regurgitation_stage && [
                "B - Progressive TR Moderate",
                "C - Asymptomatic severe TR",
                "D - Symptomatic severe TR",
                "Undefined"
            ].includes(d.tricuspid_regurgitation_stage)) return `Tricuspid regurgitation stage: <b>${d.tricuspid_regurgitation_stage}</b>`
        return false
    },

    d => {
        if (d.pulmonary_regurgitation_stage && [
                "Moderate",
                "Severe"
            ].includes(d.pulmonary_regurgitation_stage)) return `Pulmonary regurgitation stage: <b>${d.pulmonary_regurgitation_stage}</b>`
        return false
    },

    d => {
        if (d.pulmonary_stenosis && d.pulmonary_stenosis == "Present") return `Pulmonary stenosis: <b>${d.pulmonary_stenosis}</b>`
        return false
    },

    d => {
        if (d.congenital_heart_disease && d.congenital_heart_disease == "Yes") return `Congenital heart disease: <b>${d.congenital_heart_disease}</b>`
        return false
    },

]

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const checkRules = data => {

    let result = patientRules.map(r => r(data.patient.data)).concat(echoRules.map(r => r(data.echo.data))).filter(r => r != false)
    return (result.length == 0) ? false : result


}


const indicateCompleteRules = data => {

    let result =
        patientRules.map(r => r(data.patient.data))
        .concat(
            echoRules.map(r => r(data.echo.data))
        )

    result = result.filter(r => r != false)
    return (result.length > 0) ? result : ["no acceptance criteria"]
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const sapRules = [

    d => {
        if (d.patient.atrial_fibrillation && d.patient.atrial_fibrillation == "Yes") return `Atrial fibrillation: <b>${d.patient.atrial_fibrillation}</b>`
        return false
    },

    d => {
        if (d.patient.atrial_fibrillation_definition && d.patient.atrial_fibrillation_definition == "Present") return `At the moment of heart sound recording, AF is: <b>${d.patient.atrial_fibrillation_definition}</b>`
        return false
    },

    d => {
        if (d.patient.atrial_flutter && d.patient.atrial_flutter == "Yes") return `Atrial flutter: <b>${d.patient.atrial_flutter}</b>`
        return false
    },

    d => {
        if (d.patient.af_definition && d.patient.af_definition == "Present") return `At the time of heart sound recording, Atrial Flutter is: <b>${d.patient.af_definition}</b>`
        return false
    },

    d => {
        if (d.ekg.rhythm && _.intersection(["SV extrasystole", "V extrasystole", "undetermined extrasystole"], d.ekg.rhythm)) return `Rhythm: <b>${_.intersection(["SV extrasystole","V extrasystole","undetermined extrasystole"],d.ekg.rhythm).join(", ")}</b>`
        return false
    },

]

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const checkSapRules = data => {
    let result = sapRules.map(r => r(data)).filter(r => r != false)
    return (result.length == 0) ? false : result
}


const indicateSapRules = data => {

    let result = sapRuless.map(r => r(data))
    result = result.filter(r => r != false)
    return (result.length > 0) ? result : ["no acceptance criteria"]

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const checkAcceptanceCriteria = v => (v.protocol == "Complete Protocol" || !v.protocol) ? checkRules(v) : checkSapRules(v)

const indicateRules = v => (v.protocol == "Complete Protocol" || !v.protocol) ? indicateCompleteRules(v) : indicateSapRules(v)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const checkRecordsQuality = records => {
    
    let rec = records.filter(r => {
        return [
            "Apex",
            "Tricuspid",
            "Pulmonic",
            "Aortic",
            "Left Carotid",
            "Right Carotid",
            "Erb's",
            "Erb's Right",
        ].includes(r["Body Spot"])
    })

    return rec.filter(d => d.aiSegmentation && d.aiSegmentation.quality == "bad") <= Math.trunc(0.15*rec.length)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const indicateRecordsQuality = records => {
    
    const categories = ["good", "bad"]
    let rec = records.filter(r => {
        return [
            "Apex",
            "Tricuspid",
            "Pulmonic",
            "Aortic",
            "Right Carotid",
            "Erb's",
            "Erb's Right",
        ].includes(r["Body Spot"])
    })

    let values = categories.map(c => ({
        value: c,
        count: rec.filter(d => d.aiSegmentation && d.aiSegmentation.quality == c).length
    }))

    values.push({
        value: "undefined",
        count: rec.length - keys(values).map(key => values[key].count).reduce((a,b) => a+b, 0)
    })

    return {
        values,
        total: rec.length
    }    

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const acceptExamination = async (examination, SCHEMA) => {

    console.log(`LONG-TERM: autoaccept: for ${examination.patientId} on ${SCHEMA} - ACCEPT`)

    console.log(`LONG-TERM: autoaccept: update ${SCHEMA}.examinations`)

    await docdb.updateOne({
        db: ADE_DATABASE, //"ADE",
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


const updateClinicExamination = async (examination, state) => {
    
    let data = {
        criteria: state.criteria,
        quality: state.quality,
        schema: state.schema
    }

    if(state.accepted){
        data.adeStatus = "accepted"
    } else {
        data.adeStatus = "inReview"
    }
    
    data.updatedAt = new Date()
    data.updatedBy = "AUTO ACCEPT"

    await docdb.updateOne({
        db: CLINIC_DATABASE,
        collection: `sparrow-clinic.forms`,
        filter: {
            uuid: examination.id
        },
        data
    })

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const autoAccept = async settings => {

    let { examinationId, user, sourceRecords } = settings
    const SCHEMA = user.submit.schema

    try {

        const pipeline = [{
                $match: {
                    id: examinationId,
                },
            },
            {
                $lookup: {
                    from: "labels",
                    localField: "id",
                    foreignField: "examinationId",
                    as: "records"
                },
            },
        ]

        let examination = await docdb.aggregate({
            db: ADE_DATABASE,
            collection: `${SCHEMA}.examinations`,
            pipeline
        })

        examination = examination[0]


        if (examination) {

            if (checkAcceptanceCriteria(examination.forms) && checkRecordsQuality(examination.records)) {
                await acceptExamination(examination, SCHEMA)
            } else {
                console.log(`LONG-TERM: autoaccept: for ${examinationId} on ${SCHEMA} - NO ACCEPTANCE CRITERIA`)
            }

            await updateClinicExamination(examination, {
                accepted: checkAcceptanceCriteria(examination.forms) && checkRecordsQuality(examination.records),
                criteria: indicateRules(examination.forms),
                quality: indicateRecordsQuality(examination.records),
                schema: SCHEMA
            })
        }


    } catch (e) {
        console.log(`LONG-TERM: autoaccept: for ${examinationId} on ${SCHEMA} error`, e.toString(), e.stack)
        throw e
    }

}


module.exports = autoAccept