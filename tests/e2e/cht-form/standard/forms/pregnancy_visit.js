/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="pregnancy_visit">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Pregnancy Visit</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy_visit/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">मरीज़</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/inputs:label">-</span>
</h4>
<section class="or-group-data " name="/pregnancy_visit/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">Quel est le nom du patient ?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/inputs/contact/_id:label">-</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">Select a person from list</span><span lang="es" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">Sélectionnez une personne dans la liste</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">सूची से एक व्यक्ति का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">Pilih orang dari daftar</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy_visit/inputs/contact/_id:hint">-</span><input type="text" name="/pregnancy_visit/inputs/contact/_id" data-required="true()" data-type-xml="person"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/date_of_birth" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/sex" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/phone" data-type-xml="string"></label><section class="or-group-data " name="/pregnancy_visit/inputs/contact/parent"><section class="or-group-data " name="/pregnancy_visit/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/pregnancy_visit/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy_visit/group_chw_info" data-relevant=" /pregnancy_visit/inputs/source  = 'task'"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_chw_info:label">Missing Visit Report</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">Rapport de visite manquée</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">लापता जांच की रिपोर्टों</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">Laporan Kunjungan Hilang</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info:label">ripoti ya tembezi haipatikani</span>
</h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">The pregnancy visit for <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> has not been recorded.</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">La visite de grossesse pour <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> n'a pas été enregistrée.</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">गर्भावस्था की जाँच <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> के लिए दर्ज नहीं किया गया है</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">Kunjungan kehamilan untuk <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> belum terdata.</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/chw_information:label">Ripoti ya tembezi la uja uzito halijarekodiwa</span><input type="text" name="/pregnancy_visit/group_chw_info/chw_information" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_chw_info/call_button:label"><strong>Please follow up with <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> to see if <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> attended her ANC visit.</strong><br>Call: <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label"><strong> Veuillez faire un suivi avec <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> pour voir si <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> a fait sa visite CPN. </strong><br>Appelez: <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label"><strong>कृपया सुनिश्चित करें <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> की <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> एएनसी की जाँच पूरी की गयी.</strong> कॉल: <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>"</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label"><strong>Mohon dibicarakan dengan <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> untuk melihat apakah <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> menghadiri kunjungan ANC nya.</strong> Sebut: <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/call_button:label">Tafadhali fuatilia na {CHW name} kuhakikisha iliwa {patient name} alihudhuria ziara yake ya ANC</span><input type="text" name="/pregnancy_visit/group_chw_info/call_button" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">Did <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> attend her ANC visit?</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">Est-ce que <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> a fait sa visite CPN ?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">क्या <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> एएनसी जाँच पूरी हुई ?</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">Apakah <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> menghadiri kunjungan ANC nya?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc:label">Je! {patient name} alihudhuria ziara yake ya ANC</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_visit/group_chw_info/attended_anc" data-name="/pregnancy_visit/group_chw_info/attended_anc" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">-</span></label><label class=""><input type="radio" name="/pregnancy_visit/group_chw_info/attended_anc" data-name="/pregnancy_visit/group_chw_info/attended_anc" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">No</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_chw_info/attended_anc/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
      </section>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/pregnancy_visit/group_danger_signs" data-relevant=" /pregnancy_visit/visit_confirmed  = 'yes'"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_danger_signs:label">Danger Signs</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">Signes de danger</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">ख़तरे के संकेत</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">Tanda-tanda bahaya</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs:label">Ishara za hatari</span>
</h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">Confirm with <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> if <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> has any of the following danger signs.</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">Confirmez avec <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> si <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> a l'un des signes de danger suivants.</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label"><span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> के साथ पुष्टि करें के क्या <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> को इनमें से कोई खतरा है |</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">Konfirmasikan dengan <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> jika <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> memiliki tanda-tanda bahaya berikut.</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">Hakikisha kupitia <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> ikiwa <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> ana ishara ya hatari zozote hizi</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">Select all that apply</span><span lang="es" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">Sélectionnez tout ce qui s'applique</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">सभी का चयन करें जो लागू होता हो</span><span lang="id" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">Pilih semua yang berlaku</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">-</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d1" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">Pain, pressure or cramping in abdomen</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">Douleur ou crampes dans l'abdomen</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">पेट में दर्द, दबाव या ऐंठन</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">Nyeri, tekanan atau kram di perut</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d2" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d3" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">Severe nausea or vomiting</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">Nausées sévères ou vomissements</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">गंभीर उबकाई या उल्टी</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">Mual muntah berat</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d4" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">Fever of 38 degrees or higher</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">Fièvre de 38 degrés ou plus</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">38 डिग्री या अधिक का बुखार</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">Demam 38 derajat atau lebih tinggi</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d5" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">Severe headache or new, blurry vision problems</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">Maux de tête sévères ou nouveaux, problèmes de vision floue</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">Sakit kepala berat atau baru, penglihatan kabur</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d6" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">Sudden weight gain or severe swelling of feet, ankles, face, or hands</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d7" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">Less movement and kicking from the baby</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">Moins de mouvement et de coups de pied du bébé</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">बच्चे का कम हिलना या लात मारना</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">Kurang gerak dan menendang dari bayi</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d8" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">Blood in the urine or painful, burning urination</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">Du sang dans l'urine ou une miction douloureuse et brûlante</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">Darah dalam urin atau nyeri sekali, rasa seperti terbakar saat buang air kecil</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">-</span></label><label class=""><input type="checkbox" name="/pregnancy_visit/group_danger_signs/g_danger_signs" value="d9" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">Diarrhea that doesn't go away</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">La diarrhée qui ne disparaît pas</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">दस्त जो कम नहीं होता</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">Diare yang tidak kunjung sembuh</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">-</span></label>
</div>
</fieldset></fieldset>
      </section>
    <section class="or-group or-appearance-field-list " name="/pregnancy_visit/group_note"><h4>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_note:label">Note to the CHW</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">Notes à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">सामुदायिक स्वास्थ्य कर्मी के लिए नोट</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">Catatan ke kader</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_note:label">maelezo kwa mfanyikazi wa afya</span>
</h4>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">Default SMS to send to CHW</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">Message à envoyer à l'ASC</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">-</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">-</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms:label">Ujumbe msingi wa kutuma kwa mfanyikazi wa afya</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_visit/group_note/default_chw_sms" data-name="/pregnancy_visit/group_note/default_chw_sms" value="default" data-calculate="if( /pregnancy_visit/visit_confirmed  = 'yes',  if( /pregnancy_visit/group_danger_signs/g_danger_signs  != '',  'highrisk',  'default'  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">Nice work, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) has attended ANC at the health facility. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">Bon travail, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) a fait sa CPN au centre de santé. S'il vous plaît continuer à la surveiller pour les signes de danger. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">शाबाश, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र आ चुकी है | कृपया उनकी देख भाल जारी रखें और खतरे के संकेत पे निगरानी रखें | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">Kerja bagus, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) telah menghadiri ANC di fasilitas kesehatan. Silakan terus memantau mereka untuk tanda-tanda bahaya. Kami akan mengirimkan pesan ketika mereka disebabkan untuk kunjungan berikutnya mereka. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/default:label">-</span></label><label class=""><input type="radio" name="/pregnancy_visit/group_note/default_chw_sms" data-name="/pregnancy_visit/group_note/default_chw_sms" value="highrisk" data-calculate="if( /pregnancy_visit/visit_confirmed  = 'yes',  if( /pregnancy_visit/group_danger_signs/g_danger_signs  != '',  'highrisk',  'default'  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">Nice work, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) has attended ANC at the health facility. Please note that <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> has one or more danger signs for a high risk pregnancy. We will send you a message when they are due for their next visit. Thank you!</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">Bon travail, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) a fait sa CPN au centre de santé. Veuillez noter que <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> a un ou plusieurs signes de danger pour une grossesse à haut risque. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">शाबाश, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र आ चुकी है | कृपया ध्यान दें के <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> को एक या अधिक खतरे के संकेत है एक जोखिम वाला गर्भावस्था के लिए | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">Kerja sama yang baik, <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>! <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) telah melakukan kunjungan  ANC di fasilitas kesehatan. Harap dicatat bahwa Cai Kase memiliki satu atau lebih tanda-tanda bahaya k kehamilan berisiko tinggi. Kami akan mengirimkan pesan peringatan  untuk kunjungan berikutnya. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">-</span></label><label class=""><input type="radio" name="/pregnancy_visit/group_note/default_chw_sms" data-name="/pregnancy_visit/group_note/default_chw_sms" value="did_not_attend" data-calculate="if( /pregnancy_visit/visit_confirmed  = 'yes',  if( /pregnancy_visit/group_danger_signs/g_danger_signs  != '',  'highrisk',  'default'  ),  'did_not_attend' )" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">Hi <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) did not attend ANC. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">Salut <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) n'a pas fait sa CPN au centre de santé. S'il vous plaît continuer à la surveiller pour les signes de danger. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">नमस्ते <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र नहीं आयी | कृपया उनकी देख भाल जारी रखें और खतरे के संकेत पे निगरानी रखें | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">Halo <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span>, <span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span>) tidak hadir ANC. Silakan terus memantau mereka untuk tanda-tanda bahaya. Kami akan mengirimkan pesan ketika mereka disebabkan untuk kunjungan berikutnya mereka. Terima kasih!</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label"><strong>The following message will be sent to <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /pregnancy_visit/group_note/default_chw_sms_text "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label"><strong> Le message suivant sera envoyé à <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>): </strong><br> <span class="or-output" data-value=" /pregnancy_visit/group_note/default_chw_sms_text "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label"><strong>यह संदेश <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>) को भेजा जाएगा:</strong><br> <span class="or-output" data-value=" /pregnancy_visit/group_note/default_chw_sms_text "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label"><strong>Pesan ini akan dikirim ke <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>):</strong><br> <span class="or-output" data-value=" /pregnancy_visit/group_note/default_chw_sms_text "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_note/default_chw_sms_note:label">Ujumbe ufuatao utatumwa kwa <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>):**<br> <span class="or-output" data-value=" /pregnancy_visit/group_note/default_chw_sms_text "> </span></span><input type="text" name="/pregnancy_visit/group_note/default_chw_sms_note" data-type-xml="string" readonly></label><fieldset class="question simple-select or-appearance-hidden ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">Would you like to add a personal note to the message?</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">Voulez-vous ajouter une noter personnelle au message ?</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">क्या आप संदेश में कुछ और कहना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">Apakah Anda ingin menambahkan pesan?</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited:label">je! ungetaka kuongeza ujumbe wa kibinafsi</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/pregnancy_visit/group_note/is_sms_edited" data-name="/pregnancy_visit/group_note/is_sms_edited" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/yes:label">-</span></label><label class=""><input type="radio" name="/pregnancy_visit/group_note/is_sms_edited" data-name="/pregnancy_visit/group_note/is_sms_edited" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">No</span><span lang="es" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">-</span><span lang="fr" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">-</span><span lang="sw" class="option-label " data-itext-id="/pregnancy_visit/group_note/is_sms_edited/no:label">-</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">You can add a personal note to the SMS here:</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">Vous pouvez ajouter ici une note personnelle au messsage:</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">आप यहां संदेश में कुछ और जोड़ सकते हैं:</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:label">Unaweza ongeza ujumbe wa kibinafsi hapa</span><span lang="en" class="or-hint active" data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">Messages are limited in length to avoid high SMS costs.</span><span lang="es" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">-</span><span lang="fr" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">Les messages sont limités en longueur pour éviter les coûts élevés de SMS.</span><span lang="hi" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint"><span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</span><span lang="id" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">Pesan akan dikirim ke <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> (<span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</span><span lang="ne" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:hint">-</span><textarea name="/pregnancy_visit/group_note/g_chw_sms" data-constraint="string-length(.) &lt;= 715" data-type-xml="string"></textarea><span lang="en" class="or-constraint-msg active" data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</span><span lang="es" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">Votre message ne peut pas dépasser 5 SMS. Veuillez raccourcir votre message pour réduire les coûts de SMS.</span><span lang="hi" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</span><span lang="id" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</span><span lang="ne" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/pregnancy_visit/group_review"><label class="question non-select or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/submit:label"><strong>Be sure you Submit to complete this action.</strong></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label"><strong>Assurez-vous d'avoir soumis pour effectuer cette action.</strong></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label"><strong>सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये</strong></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label"><strong>Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.</strong></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/submit:label">Hakikisha unawasilisha ili kumalizia hatua hii</span><input type="text" name="/pregnancy_visit/group_review/submit" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_summary:label">Patient Information<i class="fa fa-user"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">Information du patient<i class="fa fa-user"></i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">मरीज़ की जानकारी,<i class="fa fa-user"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">Pasien informasi<I class="fa fa-user"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_summary:label">Ripoti ya mgonjwa</span><input type="text" name="/pregnancy_visit/group_review/r_summary" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"><strong><span class="or-output" data-value=" /pregnancy_visit/patient_name "> </span></strong><br>ID: <span class="or-output" data-value=" /pregnancy_visit/group_review/r_patient_id "> </span></span><input type="text" name="/pregnancy_visit/group_review/r_pregnancy_details" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_visit:label">Visit Information<i class="fa fa-plus-square"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">Information de la visite<i class="fa fa-plus-square"></i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">जाँच की जानकारी<i class="fa fa-plus-square"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">Mengunjungi informasi<i class="fa fa-plus-square"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit:label">ripoti ya ziara</span><input type="text" name="/pregnancy_visit/group_review/r_visit" data-relevant=" /pregnancy_visit/visit_confirmed  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">Pregnancy visit completed</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">Visites CPN complétes</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">गर्भावस्था की जाँच पूरी हुई</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">Kunjungan kehamilan lengkap</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_yes:label">Ziara kamilifu za uja uzito</span><input type="text" name="/pregnancy_visit/group_review/r_visit_yes" data-relevant="selected( /pregnancy_visit/visit_confirmed , 'yes')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">Pregnancy visit not completed</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">Visite CPN non complétes</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">गर्भावस्था की जाँच पूरी नहीं हुई</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">Kunjungan kehamilan tidak lengkap</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_no:label">Ziara za uja uzito zisizo kamilifu</span><input type="text" name="/pregnancy_visit/group_review/r_visit_no" data-relevant="selected( /pregnancy_visit/visit_confirmed ,'no')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h4 or-appearance-center "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">Not sure if pregnancy visit was completed</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">Pas sûr si les visites CPN sont complétes</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">गर्भावस्था की जांच की स्थिति पता नहीं</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">Tidak yakin jika kunjungan kehamilan lengkap</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_visit_unknown:label">Hamna hakika kuwa ziara ya ujauzito imekamilika</span><input type="text" name="/pregnancy_visit/group_review/r_visit_unknown" data-relevant="selected( /pregnancy_visit/visit_confirmed , 'unknown')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-red "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_referral:label">Danger Signs<i class="fa fa-warning"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">Signes de danger<i class="fa fa-warning"></i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">ख़तरे के संकेत <i class="fa fa-warning"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">Tanda-tanda bahaya<i class="fa fa-warning"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral:label">Ishara za hatari <i class="fa fa-warning"></i></span><input type="text" name="/pregnancy_visit/group_review/r_referral" data-relevant=" /pregnancy_visit/group_danger_signs/g_danger_signs  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_referral_note:label"><strong>Refer to the health facility for danger signs.</strong></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label"><strong>Référer au centre de santé pour signes de danger.</strong></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label"><strong>खतरे की सूचना होने पर उसे स्वास्थ्य केंद्र भेजें.</strong></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label"><strong>Merujuk ke fasilitas kesehatan untuk tanda bahaya.</strong></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_referral_note:label"><strong>Muelekeze kwenye kituo cha afya kwa ishara za hatari</strong></span><input type="text" name="/pregnancy_visit/group_review/r_referral_note" data-relevant=" /pregnancy_visit/group_danger_signs/g_danger_signs  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">Pain or cramping in abdomen</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">Douleur ou crampes dans l'abdomen</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">पेट में दर्द, दबाव या ऐंठन</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">Nyeri, tekanan atau kram di perut</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign1:label">Maumivu au kuponda ndani ya tumbo</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign1" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd1')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign2:label">Kunyunyiza au maji yanayotembea kutoka kwa uke au uke wa kike na harufu mbaya</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign2" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd2')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">Severe nausea or vomiting</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">Nausées sévères ou vomissements</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">गंभीर उबकाई या उल्टी</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">Mual muntah berat</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign3:label">Kichefuchefu kali au kutapika</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign3" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd3')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">Fever of 38 degrees or higher</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">Fièvre de 38 degrés ou plus</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">38 डिग्री या अधिक का बुखार</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">Demam 38 derajat atau lebih tinggi</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign4:label">Homa ya digrii 38 au zaidi</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign4" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd4')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">Severe headache or new, blurry vision problems</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">Maux de tête sévères ou nouveaux, problèmes de vision floue</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">Sakit kepala berat atau baru, penglihatan kabur</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign5:label">Maumivu ya kichwa au matatizo mapya ya macho kuona cizuri</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign5" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd5')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">Sudden weight gain or severe swelling of feet, ankles, face, or hands</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign6:label">uzito wa ghafla au kuvimba kwa miguu, kifundo cha mguu, uso, au mikono</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign6" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd6')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">Less movement and kicking from the baby (after week 20 of pregnancy)</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign7:label">Upungufu wa kutembea kwa mtoto tumboni (baada ya wiki ishirini za uja uzito)</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign7" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd7')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">Blood in the urine or painful, burning urination</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">Du sang dans l'urine ou une miction douloureuse et brûlante</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">Darah dalam urin atau nyeri sekali, rasa seperti terbakar saat buang air kecil</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign8:label">Damu katika mkojo au maumivu, kuwashwa katika kukojoa</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign8" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd8')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">Diarrhea that doesn't go away</span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">La diarrhée qui ne disparaît pas</span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">दस्त जो कम नहीं होता</span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">Diare yang tidak kunjung sembuh</span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_danger_sign9:label">Kuhara kusiokwisha</span><input type="text" name="/pregnancy_visit/group_review/r_danger_sign9" data-relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd9')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-h1 or-appearance-green "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_followup:label">Follow Up Message <i class="fa fa-envelope"></i></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">Message de suivi<i class="fa fa-envelope"></i></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">सुनिश्चित करने के लिए सन्देश <i class="fa fa-envelope"></i></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">Follow Up Pesan <i class="fa fa-envelope"></i></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup:label">Ujumbe kwa kufuatilia <i class="fa fa-envelope"></i></span><input type="text" name="/pregnancy_visit/group_review/r_followup" data-relevant=" /pregnancy_visit/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label"><strong>The following will be sent as a SMS to <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></strong></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label"><strong>Ce qui suit sera envoyé par SMS à <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></strong></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label"><strong>ये SMS के रूप में <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span> को भेजा जायेगा</strong></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label"><strong>Berikut ini akan dikirim sebagai SMS ke <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></strong></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note1:label"><strong>Zifuatazo zitatumwa kama ujumbe mfupi kwa <span class="or-output" data-value=" /pregnancy_visit/chw_name "> </span> <span class="or-output" data-value=" /pregnancy_visit/chw_phone "> </span></strong></span><input type="text" name="/pregnancy_visit/group_review/r_followup_note1" data-relevant=" /pregnancy_visit/chw_sms  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select or-appearance-li "><span lang="en" class="question-label active" data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy_visit/chw_sms "> </span></span><span lang="es" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label">-</span><span lang="fr" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy_visit/chw_sms "> </span></span><span lang="hi" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy_visit/chw_sms "> </span></span><span lang="id" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy_visit/chw_sms "> </span></span><span lang="ne" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label">-</span><span lang="sw" class="question-label " data-itext-id="/pregnancy_visit/group_review/r_followup_note2:label"> <span class="or-output" data-value=" /pregnancy_visit/chw_sms "> </span></span><input type="text" name="/pregnancy_visit/group_review/r_followup_note2" data-relevant=" /pregnancy_visit/chw_sms  != ''" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/patient_age_in_years" data-calculate="if (  /pregnancy_visit/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /pregnancy_visit/inputs/contact/date_of_birth , today() ) div 12 ) )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/patient_phone" data-calculate="../inputs/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/chw_name" data-calculate="../inputs/contact/parent/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/chw_phone" data-calculate="../inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/danger_signs" data-calculate=" /pregnancy_visit/group_danger_signs/g_danger_signs " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/referral_follow_up_needed" data-calculate="if (count-selected( /pregnancy_visit/danger_signs ) &gt; 0, 'true', 'false')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/chw_sms" data-calculate="if( /pregnancy_visit/group_note/g_chw_sms  != '', concat( /pregnancy_visit/group_note/default_chw_sms_text ,concat(' ', /pregnancy_visit/group_note/g_chw_sms )),  /pregnancy_visit/group_note/default_chw_sms_text )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/visit_confirmed" data-calculate="coalesce( /pregnancy_visit/group_chw_info/attended_anc , 'yes')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/group_note/default_chw_sms_text" data-calculate="jr:choice-name( /pregnancy_visit/group_note/default_chw_sms ,' /pregnancy_visit/group_note/default_chw_sms ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/group_review/r_patient_id" data-calculate="../../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/pregnancy_visit/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <pregnancy_visit xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="pregnancy_visit" prefix="J1!pregnancy_visit!" version="2022-03-03 15-59">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <patient_id/>
              <name/>
              <date_of_birth/>
              <sex/>
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_phone tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <danger_signs/>
          <referral_follow_up_needed/>
          <chw_sms/>
          <visit_confirmed/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <attended_anc/>
          </group_chw_info>
          <group_danger_signs tag="hidden">
            <g_danger_signs/>
          </group_danger_signs>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_review tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_pregnancy_details/>
            <r_visit/>
            <r_visit_yes/>
            <r_visit_no/>
            <r_visit_unknown/>
            <r_referral/>
            <r_referral_note/>
            <r_danger_sign1/>
            <r_danger_sign2/>
            <r_danger_sign3/>
            <r_danger_sign4/>
            <r_danger_sign5/>
            <r_danger_sign6/>
            <r_danger_sign7/>
            <r_danger_sign8/>
            <r_danger_sign9/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy_visit>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Pregnancy Visit</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/pregnancy_visit/chw_name:label">
            <value>CHW Name</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>CHW Phone</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>CHW's Note</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>Danger Signs</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>Did <output value=" /pregnancy_visit/patient_name "/> attend her ANC visit?</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>**Please follow up with <output value=" /pregnancy_visit/chw_name "/> to see if <output value=" /pregnancy_visit/patient_name "/> attended her ANC visit.**
Call: <output value=" /pregnancy_visit/chw_phone "/></value></text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>The pregnancy visit for <output value=" /pregnancy_visit/patient_name "/> has not been recorded.</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>Missing Visit Report</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>Pain, pressure or cramping in abdomen</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>Severe nausea or vomiting</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>Fever of 38 degrees or higher</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>Severe headache or new, blurry vision problems</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>Sudden weight gain or severe swelling of feet, ankles, face, or hands</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>Less movement and kicking from the baby</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>Blood in the urine or painful, burning urination</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>Diarrhea that doesn't go away</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>Select all that apply</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>Confirm with <output value=" /pregnancy_visit/chw_name "/> if <output value=" /pregnancy_visit/patient_name "/> has any of the following danger signs.</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>Danger Signs</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>Nice work, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) has attended ANC at the health facility. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>Hi <output value=" /pregnancy_visit/chw_name "/>, <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) did not attend ANC. Please continue to monitor them for danger signs. We will send you a message when they are due for their next visit. Thank you!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>Nice work, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) has attended ANC at the health facility. Please note that <output value=" /pregnancy_visit/patient_name "/> has one or more danger signs for a high risk pregnancy. We will send you a message when they are due for their next visit. Thank you!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>Default SMS to send to CHW</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>**The following message will be sent to <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>):**
 <output value=" /pregnancy_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>Messages are limited in length to avoid high SMS costs.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>Your message cannot be longer than 5 SMS messages. Please shorten your message to reduce SMS costs.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>You can add a personal note to the SMS here:</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>No</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>Yes</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>Would you like to add a personal note to the message?</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>Note to the CHW</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>Pain or cramping in abdomen</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>Bleeding or fluid leaking from vagina or vaginal discharge with bad odour</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>Severe nausea or vomiting</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>Fever of 38 degrees or higher</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>Severe headache or new, blurry vision problems</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>Sudden weight gain or severe swelling of feet, ankles, face, or hands</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>Less movement and kicking from the baby (after week 20 of pregnancy)</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>Blood in the urine or painful, burning urination</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>Diarrhea that doesn't go away</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>Follow Up Message &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>**The following will be sent as a SMS to <output value=" /pregnancy_visit/chw_name "/> <output value=" /pregnancy_visit/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy_visit/chw_sms "/></value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy_visit/patient_name "/>**
ID: <output value=" /pregnancy_visit/group_review/r_patient_id "/></value></text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>Danger Signs&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>**Refer to the health facility for danger signs.**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>Patient Information&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>Visit Information&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>Pregnancy visit not completed</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>Not sure if pregnancy visit was completed</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>Pregnancy visit completed</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>**Be sure you Submit to complete this action.**</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>Select a person from list</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>Years</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>Patient ID</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>Patient Name</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>Patient Phone</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>Patient UUID</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>Refer Patient</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/pregnancy_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/pregnancy_visit/chw_name:label">
            <value>Nom de l'ASC</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>Téléphone de l'ASC</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>Notes de l'ASC</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>Signes de danger</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>Non</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>Oui</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>Est-ce que <output value=" /pregnancy_visit/patient_name "/> a fait sa visite CPN ?</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>** Veuillez faire un suivi avec <output value=" /pregnancy_visit/chw_name "/> pour voir si <output value=" /pregnancy_visit/patient_name "/> a fait sa visite CPN. **
Appelez: <output value=" /pregnancy_visit/chw_phone "/></value></text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>La visite de grossesse pour <output value=" /pregnancy_visit/patient_name "/> n'a pas été enregistrée.</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>Rapport de visite manquée</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>Douleur ou crampes dans l'abdomen</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>Nausées sévères ou vomissements</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>Fièvre de 38 degrés ou plus</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>Maux de tête sévères ou nouveaux, problèmes de vision floue</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>Moins de mouvement et de coups de pied du bébé</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>Du sang dans l'urine ou une miction douloureuse et brûlante</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>La diarrhée qui ne disparaît pas</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>Sélectionnez tout ce qui s'applique</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>Confirmez avec <output value=" /pregnancy_visit/chw_name "/> si <output value=" /pregnancy_visit/patient_name "/> a l'un des signes de danger suivants.</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>Signes de danger</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>Bon travail, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) a fait sa CPN au centre de santé. S'il vous plaît continuer à la surveiller pour les signes de danger. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>Salut <output value=" /pregnancy_visit/chw_name "/>, <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) n'a pas fait sa CPN au centre de santé. S'il vous plaît continuer à la surveiller pour les signes de danger. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>Bon travail, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) a fait sa CPN au centre de santé. Veuillez noter que <output value=" /pregnancy_visit/patient_name "/> a un ou plusieurs signes de danger pour une grossesse à haut risque. Nous vous enverrons un message quand elle doit faire sa prochaine visite. Merci !</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>Message à envoyer à l'ASC</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>** Le message suivant sera envoyé à <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>): **
 <output value=" /pregnancy_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>Les messages sont limités en longueur pour éviter les coûts élevés de SMS.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>Votre message ne peut pas dépasser 5 SMS. Veuillez raccourcir votre message pour réduire les coûts de SMS.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>Vous pouvez ajouter ici une note personnelle au messsage:</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>Non</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>Oui</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>Voulez-vous ajouter une noter personnelle au message ?</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>Notes à l'ASC</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>Douleur ou crampes dans l'abdomen</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>Saignement ou fuite de liquide du vagin ou des pertes vaginales avec mauvaise odeur</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>Nausées sévères ou vomissements</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>Fièvre de 38 degrés ou plus</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>Maux de tête sévères ou nouveaux, problèmes de vision floue</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>Prise de poids soudaine ou gonflement important des pieds, des chevilles, du visage ou des mains</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>Moins de mouvement et de coups de pied du bébé (après 20 semaines de grossesse)</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>Du sang dans l'urine ou une miction douloureuse et brûlante</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>La diarrhée qui ne disparaît pas</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>Message de suivi&lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>**Ce qui suit sera envoyé par SMS à <output value=" /pregnancy_visit/chw_name "/> <output value=" /pregnancy_visit/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy_visit/chw_sms "/></value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy_visit/patient_name "/>**
ID: <output value=" /pregnancy_visit/group_review/r_patient_id "/></value></text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>Signes de danger&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>**Référer au centre de santé pour signes de danger.**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>Information du patient&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>Information de la visite&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>Visite CPN non complétes</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>Pas sûr si les visites CPN sont complétes</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>Visites CPN complétes</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>**Assurez-vous d'avoir soumis pour effectuer cette action.**</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>Sélectionnez une personne dans la liste</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>Quel est le nom du patient ?</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>Années</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>ID du patient</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>Nom du patient</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>Téléphone du patient</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>UUID du patient</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>Référer le patient</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/pregnancy_visit/chw_name:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नाम</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का फोन नंबर</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>सामुदायिक स्वास्थ्य कर्मी का नोट</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>ख़तरे के संकेत</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>नहीं</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>क्या <output value=" /pregnancy_visit/patient_name "/> एएनसी जाँच पूरी हुई ?</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>**कृपया सुनिश्चित करें <output value=" /pregnancy_visit/chw_name "/> की <output value=" /pregnancy_visit/patient_name "/> एएनसी की जाँच पूरी की गयी.** कॉल: <output value=" /pregnancy_visit/chw_phone "/>&quot;</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>गर्भावस्था की जाँच <output value=" /pregnancy_visit/patient_name "/> के लिए दर्ज नहीं किया गया है</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>लापता जांच की रिपोर्टों</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>पेट में दर्द, दबाव या ऐंठन</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>गंभीर उबकाई या उल्टी</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>38 डिग्री या अधिक का बुखार</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>बच्चे का कम हिलना या लात मारना</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>दस्त जो कम नहीं होता</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>सभी का चयन करें जो लागू होता हो</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value><output value=" /pregnancy_visit/chw_name "/> के साथ पुष्टि करें के क्या <output value=" /pregnancy_visit/patient_name "/> को इनमें से कोई खतरा है |</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>ख़तरे के संकेत</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>शाबाश, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र आ चुकी है | कृपया उनकी देख भाल जारी रखें और खतरे के संकेत पे निगरानी रखें | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>नमस्ते <output value=" /pregnancy_visit/chw_name "/>, <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र नहीं आयी | कृपया उनकी देख भाल जारी रखें और खतरे के संकेत पे निगरानी रखें | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>शाबाश, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) अपने गर्भावस्था जांच के लिए स्वास्थ्य केंद्र आ चुकी है | कृपया ध्यान दें के <output value=" /pregnancy_visit/patient_name "/> को एक या अधिक खतरे के संकेत है एक जोखिम वाला गर्भावस्था के लिए | उनकी अगली जांच से पहले हम आपको संदेश भेजेंगे | धन्यवाद!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>**यह संदेश <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>) को भेजा जाएगा:**
 <output value=" /pregnancy_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value><output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>) को संदेश भेजा जायेगा | संदेश की लंबाई सीमित है ताकी SMS का मूल्य उच्च ना हो|</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>आपका सन्देश 5 SMS से ऊपर नहीं हो सकता है | कृपया SMS का मूल्य को कम करने के लिए अपना सन्देश छोटा करें |</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>आप यहां संदेश में कुछ और जोड़ सकते हैं:</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>नहीं</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>क्या आप संदेश में कुछ और कहना चाहते हैं?</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के लिए नोट</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>पेट में दर्द, दबाव या ऐंठन</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>योनि से खून या द्रव पदार्थ का बहाव, या खराब बू के साथ योनि से बहाव</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>गंभीर उबकाई या उल्टी</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>38 डिग्री या अधिक का बुखार</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>गंभीर सिरदर्द या नए, धुंधली दृष्टि की समस्याएं</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>अचानक वजन का बढ़ना या पैर, टखनों, चेहरे या हाथों में गंभीर सूजन</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>बच्चे का कम हिलना या लात मारना (गर्भावस्था के 20 सप्ताह के बाद)</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>पेशाब में खून या दर्दनाक, जलता हुआ पेशाब</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>दस्त जो कम नहीं होता</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>सुनिश्चित करने के लिए सन्देश &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>**ये SMS के रूप में <output value=" /pregnancy_visit/chw_name "/> <output value=" /pregnancy_visit/chw_phone "/> को भेजा जायेगा**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy_visit/chw_sms "/></value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy_visit/patient_name "/>**
ID: <output value=" /pregnancy_visit/group_review/r_patient_id "/></value></text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>ख़तरे के संकेत &lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>**खतरे की सूचना होने पर उसे स्वास्थ्य केंद्र भेजें.**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>मरीज़ की जानकारी,&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>जाँच की जानकारी&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>गर्भावस्था की जाँच पूरी नहीं हुई</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>गर्भावस्था की जांच की स्थिति पता नहीं</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>गर्भावस्था की जाँच पूरी हुई</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>**सुनिश्चित करें के यह कार्रवाई पूरा करने के लिए आप सबमिट दबाये**</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>सूची से एक व्यक्ति का चयन करें</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>मरीज़</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>वर्षों</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>मरीज़ का ID</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>मरीज़ का नाम</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>मरीज़ का फोन नंबर</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>मरीज़ UUID</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>मरीज को स्वास्थ्य केंद्र भेजें।</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/pregnancy_visit/chw_name:label">
            <value>Nama Kader</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>Nomor Telepon Kader</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>Catatan Kader</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>Tanda-tanda bahaya</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>Tidak</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>Iya</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>Apakah <output value=" /pregnancy_visit/patient_name "/> menghadiri kunjungan ANC nya?</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>**Mohon dibicarakan dengan <output value=" /pregnancy_visit/chw_name "/> untuk melihat apakah <output value=" /pregnancy_visit/patient_name "/> menghadiri kunjungan ANC nya.** Sebut: <output value=" /pregnancy_visit/chw_phone "/></value></text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>Kunjungan kehamilan untuk <output value=" /pregnancy_visit/patient_name "/> belum terdata.</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>Laporan Kunjungan Hilang</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>Nyeri, tekanan atau kram di perut</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>Mual muntah berat</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>Demam 38 derajat atau lebih tinggi</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>Sakit kepala berat atau baru, penglihatan kabur</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>Kurang gerak dan menendang dari bayi</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>Darah dalam urin atau nyeri sekali, rasa seperti terbakar saat buang air kecil</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>Diare yang tidak kunjung sembuh</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>Pilih semua yang berlaku</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>Konfirmasikan dengan <output value=" /pregnancy_visit/chw_name "/> jika <output value=" /pregnancy_visit/patient_name "/> memiliki tanda-tanda bahaya berikut.</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>Tanda-tanda bahaya</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>Kerja bagus, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) telah menghadiri ANC di fasilitas kesehatan. Silakan terus memantau mereka untuk tanda-tanda bahaya. Kami akan mengirimkan pesan ketika mereka disebabkan untuk kunjungan berikutnya mereka. Terima kasih!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>Halo <output value=" /pregnancy_visit/chw_name "/>, <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) tidak hadir ANC. Silakan terus memantau mereka untuk tanda-tanda bahaya. Kami akan mengirimkan pesan ketika mereka disebabkan untuk kunjungan berikutnya mereka. Terima kasih!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>Kerja sama yang baik, <output value=" /pregnancy_visit/chw_name "/>! <output value=" /pregnancy_visit/patient_name "/> (<output value=" /pregnancy_visit/group_review/r_patient_id "/>) telah melakukan kunjungan  ANC di fasilitas kesehatan. Harap dicatat bahwa Cai Kase memiliki satu atau lebih tanda-tanda bahaya k kehamilan berisiko tinggi. Kami akan mengirimkan pesan peringatan  untuk kunjungan berikutnya. Terima kasih!</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>**Pesan ini akan dikirim ke <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>):**
 <output value=" /pregnancy_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>Pesan akan dikirim ke <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>). Pesan dibatasi panjang untuk menghindari biaya SMS yang tinggi.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>Pesan anda tidak boleh lebih dari 5 pesan SMS. Persingkat pesan Anda untuk mengurangi biaya SMS.</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>Anda dapat menambahkan sesuatu yang lain ke pesan di sini:</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>Tidak</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>Iya</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>Apakah Anda ingin menambahkan pesan?</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>Catatan ke kader</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>Nyeri, tekanan atau kram di perut</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>Perdarahan atau cairan merembes dari vagina atau mengalir dari vagina dengan bau busuk</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>Mual muntah berat</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>Demam 38 derajat atau lebih tinggi</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>Sakit kepala berat atau baru, penglihatan kabur</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>Lonjakan berat badan atau berat pembengkakan kaki, pergelangan kaki, wajah, atau tangan</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>Kurang gerak dan menendang dari bayi (setelah minggu 20 kehamilan)</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>Darah dalam urin atau nyeri sekali, rasa seperti terbakar saat buang air kecil</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>Diare yang tidak kunjung sembuh</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>Follow Up Pesan &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>**Berikut ini akan dikirim sebagai SMS ke <output value=" /pregnancy_visit/chw_name "/> <output value=" /pregnancy_visit/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy_visit/chw_sms "/></value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy_visit/patient_name "/>**
ID: <output value=" /pregnancy_visit/group_review/r_patient_id "/></value></text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>Tanda-tanda bahaya&lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>**Merujuk ke fasilitas kesehatan untuk tanda bahaya.**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>Pasien informasi&lt;I class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>Mengunjungi informasi&lt;i class="fa fa-plus-square"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>Kunjungan kehamilan tidak lengkap</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>Tidak yakin jika kunjungan kehamilan lengkap</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>Kunjungan kehamilan lengkap</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>**Pastikan anda sudah mengirim untuk menyelesaikan tindakan ini.**</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>Pilih orang dari daftar</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>Umur</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>Pasien ID</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>Nama Pasien</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>Nomor Telepon Pasien</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>Pasien UUID</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>Merujuk pasien</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/pregnancy_visit/chw_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/pregnancy_visit/chw_name:label">
            <value>Jina la mfanyi kazi wa afya</value>
          </text>
          <text id="/pregnancy_visit/chw_phone:label">
            <value>nambari ya simu ya mfanyi kazi wa afya</value>
          </text>
          <text id="/pregnancy_visit/chw_sms:label">
            <value>maelezo kwa mfanyikazi wa afya</value>
          </text>
          <text id="/pregnancy_visit/danger_signs:label">
            <value>dalili za hatari</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/attended_anc:label">
            <value>Je! {patient name} alihudhuria ziara yake ya ANC</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/call_button:label">
            <value>Tafadhali fuatilia na {CHW name} kuhakikisha iliwa {patient name} alihudhuria ziara yake ya ANC</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info/chw_information:label">
            <value>Ripoti ya tembezi la uja uzito halijarekodiwa</value>
          </text>
          <text id="/pregnancy_visit/group_chw_info:label">
            <value>ripoti ya tembezi haipatikani</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs/g_danger_signs:label">
            <value>Hakikisha kupitia <output value=" /pregnancy_visit/chw_name "/> ikiwa <output value=" /pregnancy_visit/patient_name "/> ana ishara ya hatari zozote hizi</value>
          </text>
          <text id="/pregnancy_visit/group_danger_signs:label">
            <value>Ishara za hatari</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/default:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms/highrisk:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms:label">
            <value>Ujumbe msingi wa kutuma kwa mfanyikazi wa afya</value>
          </text>
          <text id="/pregnancy_visit/group_note/default_chw_sms_note:label">
            <value>Ujumbe ufuatao utatumwa kwa <output value=" /pregnancy_visit/chw_name "/> (<output value=" /pregnancy_visit/chw_phone "/>):**
 <output value=" /pregnancy_visit/group_note/default_chw_sms_text "/></value></text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/g_chw_sms:label">
            <value>Unaweza ongeza ujumbe wa kibinafsi hapa</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/no:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited/yes:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/group_note/is_sms_edited:label">
            <value>je! ungetaka kuongeza ujumbe wa kibinafsi</value>
          </text>
          <text id="/pregnancy_visit/group_note:label">
            <value>maelezo kwa mfanyikazi wa afya</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign1:label">
            <value>Maumivu au kuponda ndani ya tumbo</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign2:label">
            <value>Kunyunyiza au maji yanayotembea kutoka kwa uke au uke wa kike na harufu mbaya</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign3:label">
            <value>Kichefuchefu kali au kutapika</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign4:label">
            <value>Homa ya digrii 38 au zaidi</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign5:label">
            <value>Maumivu ya kichwa au matatizo mapya ya macho kuona cizuri</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign6:label">
            <value>uzito wa ghafla au kuvimba kwa miguu, kifundo cha mguu, uso, au mikono</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign7:label">
            <value>Upungufu wa kutembea kwa mtoto tumboni (baada ya wiki ishirini za uja uzito)</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign8:label">
            <value>Damu katika mkojo au maumivu, kuwashwa katika kukojoa</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_danger_sign9:label">
            <value>Kuhara kusiokwisha</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup:label">
            <value>Ujumbe kwa kufuatilia &lt;i class="fa fa-envelope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note1:label">
            <value>**Zifuatazo zitatumwa kama ujumbe mfupi kwa <output value=" /pregnancy_visit/chw_name "/> <output value=" /pregnancy_visit/chw_phone "/>**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_followup_note2:label">
            <value><output value=" /pregnancy_visit/chw_sms "/></value>
          </text>
          <text id="/pregnancy_visit/group_review/r_pregnancy_details:label">
            <value>**<output value=" /pregnancy_visit/patient_name "/>**
ID: <output value=" /pregnancy_visit/group_review/r_patient_id "/></value></text>
          <text id="/pregnancy_visit/group_review/r_referral:label">
            <value>Ishara za hatari &lt;i class="fa fa-warning"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_referral_note:label">
            <value>**Muelekeze kwenye kituo cha afya kwa ishara za hatari**</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_summary:label">
            <value>Ripoti ya mgonjwa</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit:label">
            <value>ripoti ya ziara</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_no:label">
            <value>Ziara za uja uzito zisizo kamilifu</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_unknown:label">
            <value>Hamna hakika kuwa ziara ya ujauzito imekamilika</value>
          </text>
          <text id="/pregnancy_visit/group_review/r_visit_yes:label">
            <value>Ziara kamilifu za uja uzito</value>
          </text>
          <text id="/pregnancy_visit/group_review/submit:label">
            <value>Hakikisha unawasilisha ili kumalizia hatua hii</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:hint">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/inputs:label">
            <value>-</value>
          </text>
          <text id="/pregnancy_visit/patient_age_in_years:label">
            <value>umri</value>
          </text>
          <text id="/pregnancy_visit/patient_id:label">
            <value>nambari ya usajili ya mgonjwa</value>
          </text>
          <text id="/pregnancy_visit/patient_name:label">
            <value>jina la mgonjwa</value>
          </text>
          <text id="/pregnancy_visit/patient_phone:label">
            <value>nambari ya simu ya {Client name}</value>
          </text>
          <text id="/pregnancy_visit/patient_uuid:label">
            <value>mgonjwa UUID</value>
          </text>
          <text id="/pregnancy_visit/referral_follow_up_needed:label">
            <value>rufaa inahitaji kufuatiliwa</value>
          </text>
          <text id="/pregnancy_visit/visit_confirmed:label">
            <value>Tembezi limethibitishwa</value>
          </text>
        </translation>
      </itext>
      <instance>
        <pregnancy_visit delimiter="#" id="pregnancy_visit" prefix="J1!pregnancy_visit!" version="2022-03-03 15-59">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source>user</source>
            <source_id/>
            <contact>
              <_id/>
              <patient_id/>
              <name/>
              <date_of_birth/>
              <sex/>
              <phone/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_age_in_years tag="hidden"/>
          <patient_phone tag="hidden"/>
          <patient_uuid tag="hidden"/>
          <patient_id/>
          <patient_name/>
          <chw_name/>
          <chw_phone/>
          <danger_signs/>
          <referral_follow_up_needed/>
          <chw_sms/>
          <visit_confirmed/>
          <group_chw_info tag="hidden">
            <chw_information/>
            <call_button/>
            <attended_anc/>
          </group_chw_info>
          <group_danger_signs tag="hidden">
            <g_danger_signs/>
          </group_danger_signs>
          <group_note tag="hidden">
            <default_chw_sms/>
            <default_chw_sms_text/>
            <default_chw_sms_note/>
            <is_sms_edited>yes</is_sms_edited>
            <g_chw_sms/>
          </group_note>
          <group_review tag="hidden">
            <submit/>
            <r_summary/>
            <r_patient_id/>
            <r_pregnancy_details/>
            <r_visit/>
            <r_visit_yes/>
            <r_visit_no/>
            <r_visit_unknown/>
            <r_referral/>
            <r_referral_note/>
            <r_danger_sign1/>
            <r_danger_sign2/>
            <r_danger_sign3/>
            <r_danger_sign4/>
            <r_danger_sign5/>
            <r_danger_sign6/>
            <r_danger_sign7/>
            <r_danger_sign8/>
            <r_danger_sign9/>
            <r_followup/>
            <r_followup_note1/>
            <r_followup_note2/>
          </group_review>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </pregnancy_visit>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/pregnancy_visit/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/pregnancy_visit/inputs/source" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/source_id" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/_id" required="true()" type="db:person"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/name" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/sex" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/phone" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/pregnancy_visit/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="if (  /pregnancy_visit/inputs/contact/date_of_birth ='', '', floor( difference-in-months(  /pregnancy_visit/inputs/contact/date_of_birth , today() ) div 12 ) )" nodeset="/pregnancy_visit/patient_age_in_years" type="string"/>
      <bind calculate="../inputs/contact/phone" nodeset="/pregnancy_visit/patient_phone" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/pregnancy_visit/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/pregnancy_visit/patient_id" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/pregnancy_visit/patient_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/name" nodeset="/pregnancy_visit/chw_name" type="string"/>
      <bind calculate="../inputs/contact/parent/contact/phone" nodeset="/pregnancy_visit/chw_phone" type="string"/>
      <bind calculate=" /pregnancy_visit/group_danger_signs/g_danger_signs " nodeset="/pregnancy_visit/danger_signs" type="string"/>
      <bind calculate="if (count-selected( /pregnancy_visit/danger_signs ) &gt; 0, 'true', 'false')" nodeset="/pregnancy_visit/referral_follow_up_needed" type="string"/>
      <bind calculate="if( /pregnancy_visit/group_note/g_chw_sms  != '', concat( /pregnancy_visit/group_note/default_chw_sms_text ,concat('
', /pregnancy_visit/group_note/g_chw_sms )),  /pregnancy_visit/group_note/default_chw_sms_text )" nodeset="/pregnancy_visit/chw_sms" type="string"/>
      <bind calculate="coalesce( /pregnancy_visit/group_chw_info/attended_anc , 'yes')" nodeset="/pregnancy_visit/visit_confirmed" type="string"/>
      <bind nodeset="/pregnancy_visit/group_chw_info" relevant=" /pregnancy_visit/inputs/source  = 'task'"/>
      <bind nodeset="/pregnancy_visit/group_chw_info/chw_information" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_visit/group_chw_info/call_button" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_visit/group_chw_info/attended_anc" required="true()" type="select1"/>
      <bind nodeset="/pregnancy_visit/group_danger_signs" relevant=" /pregnancy_visit/visit_confirmed  = 'yes'"/>
      <bind nodeset="/pregnancy_visit/group_danger_signs/g_danger_signs" type="select"/>
      <bind calculate="if( /pregnancy_visit/visit_confirmed  = 'yes',
 if( /pregnancy_visit/group_danger_signs/g_danger_signs  != '',
 'highrisk',
 'default'
 ),
 'did_not_attend'
)" nodeset="/pregnancy_visit/group_note/default_chw_sms" type="select1"/>
      <bind calculate="jr:choice-name( /pregnancy_visit/group_note/default_chw_sms ,' /pregnancy_visit/group_note/default_chw_sms ')" nodeset="/pregnancy_visit/group_note/default_chw_sms_text" type="string"/>
      <bind nodeset="/pregnancy_visit/group_note/default_chw_sms_note" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_visit/group_note/is_sms_edited" required="true()" type="select1"/>
      <bind constraint="string-length(.) &lt;= 715" jr:constraintMsg="jr:itext('/pregnancy_visit/group_note/g_chw_sms:jr:constraintMsg')" nodeset="/pregnancy_visit/group_note/g_chw_sms" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/submit" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_summary" readonly="true()" type="string"/>
      <bind calculate="../../inputs/contact/patient_id" nodeset="/pregnancy_visit/group_review/r_patient_id" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_pregnancy_details" readonly="true()" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_visit" readonly="true()" relevant=" /pregnancy_visit/visit_confirmed  != ''" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_visit_yes" readonly="true()" relevant="selected( /pregnancy_visit/visit_confirmed , 'yes')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_visit_no" readonly="true()" relevant="selected( /pregnancy_visit/visit_confirmed ,'no')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_visit_unknown" readonly="true()" relevant="selected( /pregnancy_visit/visit_confirmed , 'unknown')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_referral" readonly="true()" relevant=" /pregnancy_visit/group_danger_signs/g_danger_signs  != ''" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_referral_note" readonly="true()" relevant=" /pregnancy_visit/group_danger_signs/g_danger_signs  != ''" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign1" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd1')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign2" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd2')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign3" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd3')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign4" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd4')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign5" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd5')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign6" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd6')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign7" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd7')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign8" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd8')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_danger_sign9" readonly="true()" relevant="selected( /pregnancy_visit/group_danger_signs/g_danger_signs , 'd9')" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_followup" readonly="true()" relevant=" /pregnancy_visit/chw_sms  != ''" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_followup_note1" readonly="true()" relevant=" /pregnancy_visit/chw_sms  != ''" type="string"/>
      <bind nodeset="/pregnancy_visit/group_review/r_followup_note2" readonly="true()" relevant=" /pregnancy_visit/chw_sms  != ''" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/pregnancy_visit/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/pregnancy_visit/inputs">
      <label ref="jr:itext('/pregnancy_visit/inputs:label')"/>
      <group ref="/pregnancy_visit/inputs/contact">
        <input appearance="db-object" ref="/pregnancy_visit/inputs/contact/_id">
          <label ref="jr:itext('/pregnancy_visit/inputs/contact/_id:label')"/>
          <hint ref="jr:itext('/pregnancy_visit/inputs/contact/_id:hint')"/>
        </input>
        <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/name"/>
        <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/date_of_birth"/>
        <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/sex"/>
        <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/phone"/>
        <group ref="/pregnancy_visit/inputs/contact/parent">
          <group ref="/pregnancy_visit/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/pregnancy_visit/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/pregnancy_visit/group_chw_info">
      <label ref="jr:itext('/pregnancy_visit/group_chw_info:label')"/>
      <input ref="/pregnancy_visit/group_chw_info/chw_information">
        <label ref="jr:itext('/pregnancy_visit/group_chw_info/chw_information:label')"/>
      </input>
      <input ref="/pregnancy_visit/group_chw_info/call_button">
        <label ref="jr:itext('/pregnancy_visit/group_chw_info/call_button:label')"/>
      </input>
      <select1 ref="/pregnancy_visit/group_chw_info/attended_anc">
        <label ref="jr:itext('/pregnancy_visit/group_chw_info/attended_anc:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_chw_info/attended_anc/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_chw_info/attended_anc/no:label')"/>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list" ref="/pregnancy_visit/group_danger_signs">
      <label ref="jr:itext('/pregnancy_visit/group_danger_signs:label')"/>
      <select ref="/pregnancy_visit/group_danger_signs/g_danger_signs">
        <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs:label')"/>
        <hint ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs:hint')"/>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d1:label')"/>
          <value>d1</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d2:label')"/>
          <value>d2</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d3:label')"/>
          <value>d3</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d4:label')"/>
          <value>d4</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d5:label')"/>
          <value>d5</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d6:label')"/>
          <value>d6</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d7:label')"/>
          <value>d7</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d8:label')"/>
          <value>d8</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_danger_signs/g_danger_signs/d9:label')"/>
          <value>d9</value>
        </item>
      </select>
    </group>
    <group appearance="field-list" ref="/pregnancy_visit/group_note">
      <label ref="jr:itext('/pregnancy_visit/group_note:label')"/>
      <select1 appearance="hidden" ref="/pregnancy_visit/group_note/default_chw_sms">
        <label ref="jr:itext('/pregnancy_visit/group_note/default_chw_sms:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_note/default_chw_sms/default:label')"/>
          <value>default</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_note/default_chw_sms/highrisk:label')"/>
          <value>highrisk</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_note/default_chw_sms/did_not_attend:label')"/>
          <value>did_not_attend</value>
        </item>
      </select1>
      <input ref="/pregnancy_visit/group_note/default_chw_sms_note">
        <label ref="jr:itext('/pregnancy_visit/group_note/default_chw_sms_note:label')"/>
      </input>
      <select1 appearance="hidden" ref="/pregnancy_visit/group_note/is_sms_edited">
        <label ref="jr:itext('/pregnancy_visit/group_note/is_sms_edited:label')"/>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_note/is_sms_edited/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/pregnancy_visit/group_note/is_sms_edited/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input appearance="multiline" ref="/pregnancy_visit/group_note/g_chw_sms">
        <label ref="jr:itext('/pregnancy_visit/group_note/g_chw_sms:label')"/>
        <hint ref="jr:itext('/pregnancy_visit/group_note/g_chw_sms:hint')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/pregnancy_visit/group_review">
      <input appearance="center" ref="/pregnancy_visit/group_review/submit">
        <label ref="jr:itext('/pregnancy_visit/group_review/submit:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/pregnancy_visit/group_review/r_summary">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_summary:label')"/>
      </input>
      <input appearance="h4 center" ref="/pregnancy_visit/group_review/r_pregnancy_details">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_pregnancy_details:label')"/>
      </input>
      <input appearance="h1 blue" ref="/pregnancy_visit/group_review/r_visit">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_visit:label')"/>
      </input>
      <input appearance="h4 center" ref="/pregnancy_visit/group_review/r_visit_yes">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_visit_yes:label')"/>
      </input>
      <input appearance="h4 center" ref="/pregnancy_visit/group_review/r_visit_no">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_visit_no:label')"/>
      </input>
      <input appearance="h4 center" ref="/pregnancy_visit/group_review/r_visit_unknown">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_visit_unknown:label')"/>
      </input>
      <input appearance="h1 red" ref="/pregnancy_visit/group_review/r_referral">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_referral:label')"/>
      </input>
      <input ref="/pregnancy_visit/group_review/r_referral_note">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_referral_note:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign1">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign1:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign2">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign2:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign3">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign3:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign4">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign4:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign5">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign5:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign6">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign6:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign7">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign7:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign8">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign8:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_danger_sign9">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_danger_sign9:label')"/>
      </input>
      <input appearance="h1 green" ref="/pregnancy_visit/group_review/r_followup">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_followup:label')"/>
      </input>
      <input ref="/pregnancy_visit/group_review/r_followup_note1">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_followup_note1:label')"/>
      </input>
      <input appearance="li" ref="/pregnancy_visit/group_review/r_followup_note2">
        <label ref="jr:itext('/pregnancy_visit/group_review/r_followup_note2:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
