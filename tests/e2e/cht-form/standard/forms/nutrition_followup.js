/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="nutrition_followup">
<section class="form-logo"></section><h3 dir="auto" id="form-title">child nutrition followup</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/nutrition_followup/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_followup/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/inputs:label">-</span>
</h4>
<label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/source" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/source_id" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_followup/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/inputs/contact/_id:label">Quel est l'identifiant du patient?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/inputs/contact/_id:label">-</span><span lang="" class="or-hint active">Select a person from list</span><input type="text" name="/nutrition_followup/inputs/contact/_id" data-type-xml="person"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/contact/date_of_birth" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_followup/inputs/contact/parent"><section class="or-group-data " name="/nutrition_followup/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_followup/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_followup/attend_visit:label">Did <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> attend the visit?</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/attend_visit:label">¿Asistió <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> a la visita?</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/attend_visit:label">Est-ce que <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> a assisté à la visite?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/attend_visit:label">क्या <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> यात्रा में शामिल हुए?</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/attend_visit:label">Apakah <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> menghadiri kunjungan?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/attend_visit:label">के <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> भ्रमण गर्यो?</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_followup/attend_visit" data-name="/nutrition_followup/attend_visit" value="yes" data-relevant=" /nutrition_followup/inputs/source  = 'task'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/attend_visit/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/attend_visit/yes:label">Sí</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/attend_visit/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/attend_visit/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/attend_visit/yes:label">iya nih</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/attend_visit/yes:label">हो</span></label><label class=""><input type="radio" name="/nutrition_followup/attend_visit" data-name="/nutrition_followup/attend_visit" value="no" data-relevant=" /nutrition_followup/inputs/source  = 'task'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/attend_visit/no:label">No</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/attend_visit/no:label">No</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/attend_visit/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/attend_visit/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/attend_visit/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/attend_visit/no:label">होइन</span></label>
</div>
</fieldset></fieldset>
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/nutrition_followup/measurements" data-relevant=" /nutrition_followup/visit_confirmed  = 'yes'"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements:label">Measurements</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements:label">Mediciones</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements:label">Des mesures</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements:label">माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements:label">Pengukuran</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements:label">माप</span>
</h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/gender:label">Gender</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/gender:label">Género</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/gender:label">Le sexe</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/gender:label">लिंग</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/gender:label">Jenis kelamin</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/gender:label">लिङ्ग</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_followup/measurements/gender" data-name="/nutrition_followup/measurements/gender" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/measurements/gender/male:label">Male</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/male:label">Masculino</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/male:label">Mâle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/male:label">पुरुष</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/male:label">Pria</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/male:label">नर</span></label><label class=""><input type="radio" name="/nutrition_followup/measurements/gender" data-name="/nutrition_followup/measurements/gender" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/measurements/gender/female:label">Female</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/female:label">Hembra</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/female:label">Femelle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/female:label">महिला</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/female:label">Wanita</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/measurements/gender/female:label">महिला</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/weight:label">Weight (kgs)</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/weight:label">Peso (kg)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/weight:label">poids (kg)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/weight:label">वजन (किलोग्राम)</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/weight:label">Berat (kg)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/weight:label">वजन (किलोग्राम)</span><span class="required">*</span><input type="number" name="/nutrition_followup/measurements/weight" data-required="true()" data-constraint=". &gt;= 0.8 and . &lt;= 68.5" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">Weight should be between 0.8 kg and 68.5 kg</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/weight:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/height:label">Height (cms)</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/height:label">Altura (cm)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/height:label">Hauteur (cm)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/height:label">ऊंचाई (सेंटिमीटर)</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/height:label">Tinggi (cm)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/height:label">ऊँचाई (सेमी)</span><span class="required">*</span><input type="number" name="/nutrition_followup/measurements/height" data-required="true()" data-constraint=". &gt;= 45 and . &lt;= 120" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">Height should be between 45 cm and 120 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/height:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/muac:label">MUAC Measurement</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/muac:label">Medida de muac</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/muac:label">Mesure MUAC</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/muac:label">MUAC माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/muac:label">Pengukuran MUAC</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/muac:label">MUAC माप</span><input type="number" name="/nutrition_followup/measurements/muac" data-constraint=". &gt;= 5 and . &lt;= 30" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">MUAC should be between 5 and 30 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_followup/measurements/muac:jr:constraintMsg">-</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/nn3:label">Weight for height: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/nn3:label">peso por altura: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/nn3:label">poids pour taille: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/nn3:label">वजन ऊंचाई के लिए: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/nn3:label">berat untuk tinggi: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/nn3:label">वजनको लागि वजन: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><input type="text" name="/nutrition_followup/measurements/nn3" data-relevant=" /nutrition_followup/measurements/weight  != '' and  /nutrition_followup/measurements/height  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/n_14:label">interpretation: &lt; -3SD [Severely Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/n_14:label">interpretación: &lt;-3SD [muy malgastada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/n_14:label">interprétation: &lt;-3SD [gravement gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/n_14:label">व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/n_14:label">interpretasi: &lt;-3SD [Sangat Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/n_14:label">व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</span><input type="text" name="/nutrition_followup/measurements/n_14" data-relevant=" /nutrition_followup/wfh  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/n_15:label">interpretation: -3SD to &lt;-2SD [Moderately Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/n_15:label">interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/n_15:label">interprétation: -3SD à &lt;-2SD [modérément gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/n_15:label">व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/n_15:label">interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/n_15:label">व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</span><input type="text" name="/nutrition_followup/measurements/n_15" data-relevant=" /nutrition_followup/wfh  &lt; -2 and  /nutrition_followup/wfh  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/n_16:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/n_16:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/n_16:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/n_16:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/n_16:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/n_16:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_followup/measurements/n_16" data-relevant=" /nutrition_followup/wfh  &lt;= 2 and  /nutrition_followup/wfh  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/n_17:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/n_17:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/n_17:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/n_17:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/n_17:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/n_17:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_followup/measurements/n_17" data-relevant=" /nutrition_followup/wfh  &gt; 2" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/exit:label">Do you want to exit <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> from <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> treatment program today?</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/exit:label">¿Desea salir de <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> del programa de tratamiento <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> hoy?</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/exit:label">Voulez-vous quitter le programme de traitement <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> du programme de traitement <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> aujourd'hui?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/exit:label">क्या आप आज <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> उपचा�� कार्यक्रम से <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> से बाहर निकलना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/exit:label">Apakah Anda ingin keluar dari <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> dari program perawatan <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> hari ini?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/exit:label">के तपाईँ <span class="or-output" data-value=" /nutrition_followup/patient_name "> </span> बाट <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> उपचार कार्यक्रमबाट आज बाहिर निस्कन चाहनुहुन्छ?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_followup/measurements/exit" data-name="/nutrition_followup/measurements/exit" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/measurements/exit/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/yes:label">Sí</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/yes:label">iya nih</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/yes:label">हो</span></label><label class=""><input type="radio" name="/nutrition_followup/measurements/exit" data-name="/nutrition_followup/measurements/exit" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_followup/measurements/exit/no:label">No</span><span lang="es" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/no:label">No</span><span lang="fr" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/nutrition_followup/measurements/exit/no:label">होइन</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/measurements/n:label">Please remember to fill out the nutrition exit form.</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/measurements/n:label">Por favor recuerde llenar el formulario de salida de nutrición.</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/measurements/n:label">S'il vous plaît n'oubliez pas de remplir le formulaire de sortie de la nutrition.</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/measurements/n:label">कृपया पोषण निकास फ़ॉर्म को भरना याद रखें।</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/measurements/n:label">Harap ingat untuk mengisi formulir keluar nutrisi.</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/measurements/n:label">कृपया पोषण निकास फारम भर्न सम्झनुहोस्।</span><input type="text" name="/nutrition_followup/measurements/n" data-relevant=" /nutrition_followup/measurements/exit  = 'yes'" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group-data or-branch pre-init or-appearance-field-list or-appearance-summary " name="/nutrition_followup/summary" data-relevant=" /nutrition_followup/visit_confirmed  = 'yes'"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_1:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_followup/patient_name "> </span></h4></span><input type="text" name="/nutrition_followup/summary/n_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_2:label">Gender: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_2:label">Género: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_2:label">Le sexe: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_2:label">लिंग: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_2:label">Jenis kelamin: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_2:label">लिङ्ग: <span class="or-output" data-value=" /nutrition_followup/measurements/gender "> </span></span><input type="text" name="/nutrition_followup/summary/n_2" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_3:label">Weight: <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> kg</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_3:label">peso <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> kg</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_3:label">poids <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> kg</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_3:label">वजन <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> किलो</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_3:label">berat <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> kg</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_3:label">वजन <span class="or-output" data-value=" /nutrition_followup/measurements/weight "> </span> किलो</span><input type="text" name="/nutrition_followup/summary/n_3" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_4:label">Height: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> cm</span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_4:label">Altura: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> cm</span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_4:label">Hauteur: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> cm</span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_4:label">ऊंचाई: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> सेमी</span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_4:label">Tinggi: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> cm</span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_4:label">ऊँचाई: <span class="or-output" data-value=" /nutrition_followup/measurements/height "> </span> सेमी</span><input type="text" name="/nutrition_followup/summary/n_4" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_5:label">Weight for height z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_5:label">Peso para la altura z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_5:label">Poids pour la taille z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_5:label">ऊंचाई के लिए वजन z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_5:label">Berat untuk tinggi z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_5:label">उचाईको लागि वजन z-score: <span class="or-output" data-value=" /nutrition_followup/wfh "> </span></span><input type="text" name="/nutrition_followup/summary/n_5" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_followup/summary/n_6:label">To be exited from <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> treatment program: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_followup/summary/n_6:label">Para salir del programa de tratamiento <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span>: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_followup/summary/n_6:label">À quitter du programme de traitement <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span>: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_followup/summary/n_6:label"><span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> उपचार कार्यक्रम से बाहर निकलने के लिए: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_followup/summary/n_6:label">Untuk keluar dari program perawatan <span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span>: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_followup/summary/n_6:label"><span class="or-output" data-value=" /nutrition_followup/treatment_program "> </span> उपचार कार्यक्रमबाट बाहिर निस्कन: <span class="or-output" data-value=" /nutrition_followup/measurements/exit "> </span></span><input type="text" name="/nutrition_followup/summary/n_6" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/nutrition_followup/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/visit_confirmed" data-calculate="coalesce( /nutrition_followup/attend_visit , 'yes')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/treatment_program" data-calculate="instance('contact-summary')/context/treatment_program" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/wfh" data-calculate="round(z-score('weight-for-height',  /nutrition_followup/measurements/gender ,  /nutrition_followup/measurements/height ,  /nutrition_followup/measurements/weight ), 1)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_followup/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <nutrition_followup xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="nutrition_followup" prefix="J1!nutrition_followup!" version="2022-03-03 15-48">
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
              <name/>
              <patient_id/>
              <date_of_birth/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_uuid/>
          <patient_name/>
          <patient_id/>
          <attend_visit/>
          <visit_confirmed/>
          <treatment_program/>
          <wfh/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
            <nn3/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
            <exit/>
            <n/>
          </measurements>
          <summary>
            <n_1/>
            <n_2/>
            <n_3/>
            <n_4/>
            <n_5/>
            <n_6/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_followup>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>child nutrition followup</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>Yes</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>Did <output value=" /nutrition_followup/patient_name "/> attend the visit?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>Yes</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>Do you want to exit <output value=" /nutrition_followup/patient_name "/> from <output value=" /nutrition_followup/treatment_program "/> treatment program today?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>Female</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>Male</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>Gender</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>Height should be between 45 cm and 120 cm</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>Height (cms)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>MUAC should be between 5 and 30 cm</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>MUAC Measurement</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>Please remember to fill out the nutrition exit form.</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>interpretation: &lt; -3SD [Severely Wasted]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Wasted]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>Weight for height: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>Weight should be between 0.8 kg and 68.5 kg</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>Weight (kgs)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>Measurements</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>Gender: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>Weight: <output value=" /nutrition_followup/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>Height: <output value=" /nutrition_followup/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>Weight for height z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value>To be exited from <output value=" /nutrition_followup/treatment_program "/> treatment program: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>Did <output value=" /nutrition_followup/patient_name "/> attend the visit?</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>Sí</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>¿Asistió <output value=" /nutrition_followup/patient_name "/> a la visita?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>Sí</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>¿Desea salir de <output value=" /nutrition_followup/patient_name "/> del programa de tratamiento <output value=" /nutrition_followup/treatment_program "/> hoy?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>Hembra</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>Masculino</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>Género</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>Altura (cm)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>Medida de muac</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>Por favor recuerde llenar el formulario de salida de nutrición.</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>interpretación: &lt;-3SD [muy malgastada]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>peso por altura: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>Peso (kg)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>Mediciones</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>Género: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>peso <output value=" /nutrition_followup/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>Altura: <output value=" /nutrition_followup/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>Peso para la altura z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value>Para salir del programa de tratamiento <output value=" /nutrition_followup/treatment_program "/>: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>¿Asistió <output value=" /nutrition_followup/patient_name "/> a la visita?</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>Non</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>Oui</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>Est-ce que <output value=" /nutrition_followup/patient_name "/> a assisté à la visite?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>Quel est l'identifiant du patient?</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>Non</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>Oui</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>Voulez-vous quitter le programme de traitement <output value=" /nutrition_followup/patient_name "/> du programme de traitement <output value=" /nutrition_followup/treatment_program "/> aujourd'hui?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>Femelle</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>Mâle</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>Le sexe</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>Hauteur (cm)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>Mesure MUAC</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>S'il vous plaît n'oubliez pas de remplir le formulaire de sortie de la nutrition.</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>interprétation: &lt;-3SD [gravement gaspillé]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>interprétation: -3SD à &lt;-2SD [modérément gaspillé]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>poids pour taille: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>poids (kg)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>Des mesures</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>Le sexe: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>poids <output value=" /nutrition_followup/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>Hauteur: <output value=" /nutrition_followup/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>Poids pour la taille z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value>À quitter du programme de traitement <output value=" /nutrition_followup/treatment_program "/>: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>Est-ce que <output value=" /nutrition_followup/patient_name "/> a assisté à la visite?</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>नहीं</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>क्या <output value=" /nutrition_followup/patient_name "/> यात्रा में शामिल हुए?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>नहीं</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>क्या आप आज <output value=" /nutrition_followup/treatment_program "/> उपचार कार्यक्रम से <output value=" /nutrition_followup/patient_name "/> से बाहर निकलना चाहते हैं?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>पुरुष</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>लिंग</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>ऊंचाई (सेंटिमीटर)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>कृपया पोषण निकास फ़ॉर्म को भरना याद रखें।</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>वजन ऊंचाई के लिए: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>माप</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>लिंग: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>वजन <output value=" /nutrition_followup/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>ऊंचाई: <output value=" /nutrition_followup/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>ऊंचाई के लिए वजन z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value><output value=" /nutrition_followup/treatment_program "/> उपचार कार्यक्रम से बाहर निकलने के लिए: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>क्या <output value=" /nutrition_followup/patient_name "/> यात्रा में शामिल हुए?</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>Tidak</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>iya nih</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>Apakah <output value=" /nutrition_followup/patient_name "/> menghadiri kunjungan?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>Tidak</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>iya nih</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>Apakah Anda ingin keluar dari <output value=" /nutrition_followup/patient_name "/> dari program perawatan <output value=" /nutrition_followup/treatment_program "/> hari ini?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>Wanita</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>Pria</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>Jenis kelamin</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>Tinggi (cm)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>Pengukuran MUAC</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>Harap ingat untuk mengisi formulir keluar nutrisi.</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>interpretasi: &lt;-3SD [Sangat Terbuang]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>berat untuk tinggi: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>Berat (kg)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>Pengukuran</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>Jenis kelamin: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>berat <output value=" /nutrition_followup/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>Tinggi: <output value=" /nutrition_followup/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>Berat untuk tinggi z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value>Untuk keluar dari program perawatan <output value=" /nutrition_followup/treatment_program "/>: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>Apakah <output value=" /nutrition_followup/patient_name "/> menghadiri kunjungan?</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/nutrition_followup/attend_visit/no:label">
            <value>होइन</value>
          </text>
          <text id="/nutrition_followup/attend_visit/yes:label">
            <value>हो</value>
          </text>
          <text id="/nutrition_followup/attend_visit:label">
            <value>के <output value=" /nutrition_followup/patient_name "/> भ्रमण गर्यो?</value>
          </text>
          <text id="/nutrition_followup/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/no:label">
            <value>होइन</value>
          </text>
          <text id="/nutrition_followup/measurements/exit/yes:label">
            <value>हो</value>
          </text>
          <text id="/nutrition_followup/measurements/exit:label">
            <value>के तपाईँ <output value=" /nutrition_followup/patient_name "/> बाट <output value=" /nutrition_followup/treatment_program "/> उपचार कार्यक्रमबाट आज बाहिर निस्कन चाहनुहुन्छ?</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_followup/measurements/gender/male:label">
            <value>नर</value>
          </text>
          <text id="/nutrition_followup/measurements/gender:label">
            <value>लिङ्ग</value>
          </text>
          <text id="/nutrition_followup/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/height:label">
            <value>ऊँचाई (सेमी)</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_followup/measurements/n:label">
            <value>कृपया पोषण निकास फारम भर्न सम्झनुहोस्।</value>
          </text>
          <text id="/nutrition_followup/measurements/n_14:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_15:label">
            <value>व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_16:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_followup/measurements/n_17:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_followup/measurements/nn3:label">
            <value>वजनको लागि वजन: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_followup/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_followup/measurements:label">
            <value>माप</value>
          </text>
          <text id="/nutrition_followup/summary/n_1:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_followup/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_followup/summary/n_2:label">
            <value>लिङ्ग: <output value=" /nutrition_followup/measurements/gender "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_3:label">
            <value>वजन <output value=" /nutrition_followup/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_followup/summary/n_4:label">
            <value>ऊँचाई: <output value=" /nutrition_followup/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_followup/summary/n_5:label">
            <value>उचाईको लागि वजन z-score: <output value=" /nutrition_followup/wfh "/></value>
          </text>
          <text id="/nutrition_followup/summary/n_6:label">
            <value><output value=" /nutrition_followup/treatment_program "/> उपचार कार्यक्रमबाट बाहिर निस्कन: <output value=" /nutrition_followup/measurements/exit "/></value></text>
          <text id="/nutrition_followup/visit_confirmed:label">
            <value>के <output value=" /nutrition_followup/patient_name "/> भ्रमण गर्यो?</value>
          </text>
        </translation>
      </itext>
      <instance>
        <nutrition_followup delimiter="#" id="nutrition_followup" prefix="J1!nutrition_followup!" version="2022-03-03 15-48">
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
              <name/>
              <patient_id/>
              <date_of_birth/>
              <parent>
                <contact>
                  <phone/>
                  <name/>
                </contact>
              </parent>
            </contact>
          </inputs>
          <patient_uuid/>
          <patient_name/>
          <patient_id/>
          <attend_visit/>
          <visit_confirmed/>
          <treatment_program/>
          <wfh/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
            <nn3/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
            <exit/>
            <n/>
          </measurements>
          <summary>
            <n_1/>
            <n_2/>
            <n_3/>
            <n_4/>
            <n_5/>
            <n_6/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_followup>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/nutrition_followup/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/nutrition_followup/inputs/source" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/source_id" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/nutrition_followup/inputs/contact/name" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/nutrition_followup/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/nutrition_followup/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/nutrition_followup/patient_name" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/nutrition_followup/patient_id" type="string"/>
      <bind nodeset="/nutrition_followup/attend_visit" relevant=" /nutrition_followup/inputs/source  = 'task'" type="select1"/>
      <bind calculate="coalesce( /nutrition_followup/attend_visit , 'yes')" nodeset="/nutrition_followup/visit_confirmed" type="string"/>
      <bind calculate="instance('contact-summary')/context/treatment_program" nodeset="/nutrition_followup/treatment_program" type="string"/>
      <bind calculate="round(z-score('weight-for-height',  /nutrition_followup/measurements/gender ,  /nutrition_followup/measurements/height ,  /nutrition_followup/measurements/weight ), 1)" nodeset="/nutrition_followup/wfh" type="string"/>
      <bind nodeset="/nutrition_followup/measurements" relevant=" /nutrition_followup/visit_confirmed  = 'yes'"/>
      <bind nodeset="/nutrition_followup/measurements/gender" required="true()" type="select1"/>
      <bind constraint=". &gt;= 0.8 and . &lt;= 68.5" jr:constraintMsg="jr:itext('/nutrition_followup/measurements/weight:jr:constraintMsg')" nodeset="/nutrition_followup/measurements/weight" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 45 and . &lt;= 120" jr:constraintMsg="jr:itext('/nutrition_followup/measurements/height:jr:constraintMsg')" nodeset="/nutrition_followup/measurements/height" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 5 and . &lt;= 30" jr:constraintMsg="jr:itext('/nutrition_followup/measurements/muac:jr:constraintMsg')" nodeset="/nutrition_followup/measurements/muac" required="false()" type="decimal"/>
      <bind nodeset="/nutrition_followup/measurements/nn3" readonly="true()" relevant=" /nutrition_followup/measurements/weight  != '' and  /nutrition_followup/measurements/height  != ''" type="string"/>
      <bind nodeset="/nutrition_followup/measurements/n_14" readonly="true()" relevant=" /nutrition_followup/wfh  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_followup/measurements/n_15" readonly="true()" relevant=" /nutrition_followup/wfh  &lt; -2 and  /nutrition_followup/wfh  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_followup/measurements/n_16" readonly="true()" relevant=" /nutrition_followup/wfh  &lt;= 2 and  /nutrition_followup/wfh  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_followup/measurements/n_17" readonly="true()" relevant=" /nutrition_followup/wfh  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_followup/measurements/exit" required="true()" type="select1"/>
      <bind nodeset="/nutrition_followup/measurements/n" readonly="true()" relevant=" /nutrition_followup/measurements/exit  = 'yes'" type="string"/>
      <bind nodeset="/nutrition_followup/summary" relevant=" /nutrition_followup/visit_confirmed  = 'yes'"/>
      <bind nodeset="/nutrition_followup/summary/n_1" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_followup/summary/n_2" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_followup/summary/n_3" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_followup/summary/n_4" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_followup/summary/n_5" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_followup/summary/n_6" readonly="true()" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/nutrition_followup/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/nutrition_followup/inputs">
      <label ref="jr:itext('/nutrition_followup/inputs:label')"/>
      <input appearance="hidden" ref="/nutrition_followup/inputs/source"/>
      <input appearance="hidden" ref="/nutrition_followup/inputs/source_id"/>
      <group ref="/nutrition_followup/inputs/contact">
        <input appearance="db-object" ref="/nutrition_followup/inputs/contact/_id">
          <label ref="jr:itext('/nutrition_followup/inputs/contact/_id:label')"/>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/nutrition_followup/inputs/contact/name"/>
        <input appearance="hidden" ref="/nutrition_followup/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/nutrition_followup/inputs/contact/date_of_birth"/>
        <group ref="/nutrition_followup/inputs/contact/parent">
          <group ref="/nutrition_followup/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/nutrition_followup/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/nutrition_followup/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <select1 ref="/nutrition_followup/attend_visit">
      <label ref="jr:itext('/nutrition_followup/attend_visit:label')"/>
      <item>
        <label ref="jr:itext('/nutrition_followup/attend_visit/yes:label')"/>
        <value>yes</value>
      </item>
      <item>
        <label ref="jr:itext('/nutrition_followup/attend_visit/no:label')"/>
        <value>no</value>
      </item>
    </select1>
    <group appearance="field-list" ref="/nutrition_followup/measurements">
      <label ref="jr:itext('/nutrition_followup/measurements:label')"/>
      <select1 ref="/nutrition_followup/measurements/gender">
        <label ref="jr:itext('/nutrition_followup/measurements/gender:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_followup/measurements/gender/male:label')"/>
          <value>male</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_followup/measurements/gender/female:label')"/>
          <value>female</value>
        </item>
      </select1>
      <input ref="/nutrition_followup/measurements/weight">
        <label ref="jr:itext('/nutrition_followup/measurements/weight:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/height">
        <label ref="jr:itext('/nutrition_followup/measurements/height:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/muac">
        <label ref="jr:itext('/nutrition_followup/measurements/muac:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/nn3">
        <label ref="jr:itext('/nutrition_followup/measurements/nn3:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/n_14">
        <label ref="jr:itext('/nutrition_followup/measurements/n_14:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/n_15">
        <label ref="jr:itext('/nutrition_followup/measurements/n_15:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/n_16">
        <label ref="jr:itext('/nutrition_followup/measurements/n_16:label')"/>
      </input>
      <input ref="/nutrition_followup/measurements/n_17">
        <label ref="jr:itext('/nutrition_followup/measurements/n_17:label')"/>
      </input>
      <select1 ref="/nutrition_followup/measurements/exit">
        <label ref="jr:itext('/nutrition_followup/measurements/exit:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_followup/measurements/exit/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_followup/measurements/exit/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <input ref="/nutrition_followup/measurements/n">
        <label ref="jr:itext('/nutrition_followup/measurements/n:label')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/nutrition_followup/summary">
      <input ref="/nutrition_followup/summary/n_1">
        <label ref="jr:itext('/nutrition_followup/summary/n_1:label')"/>
      </input>
      <input ref="/nutrition_followup/summary/n_2">
        <label ref="jr:itext('/nutrition_followup/summary/n_2:label')"/>
      </input>
      <input ref="/nutrition_followup/summary/n_3">
        <label ref="jr:itext('/nutrition_followup/summary/n_3:label')"/>
      </input>
      <input ref="/nutrition_followup/summary/n_4">
        <label ref="jr:itext('/nutrition_followup/summary/n_4:label')"/>
      </input>
      <input ref="/nutrition_followup/summary/n_5">
        <label ref="jr:itext('/nutrition_followup/summary/n_5:label')"/>
      </input>
      <input ref="/nutrition_followup/summary/n_6">
        <label ref="jr:itext('/nutrition_followup/summary/n_6:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
