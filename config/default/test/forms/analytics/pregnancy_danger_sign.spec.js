const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const path = require('path');
const moment = require('moment');
const sinon = require('sinon');
const { pregnancyRegistrationScenarios, pregnancyDangerSignScenarios } = require('../../form-inputs');
const harness = new TestRunner({
    xformFolderPath: path.join(__dirname, '../../../forms/app'),
});
let clock;
const now = '2000-01-01';
describe('Pregnancy danger sign form analytic field tests', () => {
    before(async () => { return await harness.start(); });
    after(async () => { return await harness.stop(); });
    beforeEach(async () => {
        await harness.clear();
        await harness.setNow(now);
        clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
        return await harness.loadForm('pregnancy');
    });
    afterEach(() => {
        expect(harness.consoleErrors).to.be.empty;
        if (clock) clock.restore();
    });

    it('danger sign follow up from pregnancy danger sign', async () => {
        const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
        expect(actionFormResult.errors).to.be.empty;
        harness.setNow('2000-01-30');
        clock = sinon.useFakeTimers(moment('2000-01-30').toDate());
        await harness.loadForm('pregnancy_danger_sign');
        const dangerSignForm = await harness.fillForm(...pregnancyDangerSignScenarios.danger);
        expect(dangerSignForm.report.fields.data).to.deep.include({
            o_vaginal_bleeding: 'yes',
            o_fits: 'yes',
            o_severe_abdominal_pain: 'yes',
            o_severe_headache: 'yes',
            o_very_pale: 'yes',
            o_fever: 'yes',
            o_reduced_or_no_foetal_movements: 'yes',
            o_breaking_water: 'yes',
            o_easily_tired: 'yes',
            o_face_hand_swelling: 'yes',
            o_breathlessness: 'yes',
            o_has_danger_sign: 'yes',
            m_patient_uuid: 'patient_id',
            m_patient_id: 'patient_id',
            m_household_uuid: 'patient_parent_id',
            m_source: 'action',
            m_source_id: '',
            m_pregnancy_uuid: '1'
        });
        expect(dangerSignForm.errors).to.be.empty;
        const tasksAfterDangerSignReport = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

        await harness.flush(1);
        await harness.loadAction(tasksAfterDangerSignReport[0].actions[0]);
        const dangerSignFollowupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
        expect(dangerSignFollowupFormResult.errors).to.be.empty;
        expect(dangerSignFollowupFormResult.report.fields.data).to.deep.include({
            o_visited_hf: 'yes',
            o_still_experiencing_danger_sign: 'no',
            o_vaginal_bleeding: '',
            o_fits: '',
            o_severe_abdominal_pain: '',
            o_severe_headache: '',
            o_very_pale: '',
            o_fever: '',
            o_reduced_or_no_foetal_movements: '',
            o_breaking_water: '',
            o_easily_tired: '',
            o_face_hand_swelling: '',
            o_breathlessness: '',
            o_has_danger_sign: 'no',
            m_patient_uuid: 'patient_id',
            m_patient_id: 'patient_id',
            m_household_uuid: 'patient_parent_id',
            m_source: 'task',
            m_source_id: '2',
            m_pregnancy_uuid: '1'
        });
    });
});
