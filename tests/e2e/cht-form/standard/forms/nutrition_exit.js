/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="nutrition_exit">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Child nutrition treatment exit</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/nutrition_exit/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/inputs:label">-</span>
</h4>
<label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/source" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/source_id" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_exit/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/inputs/contact/_id:label">Quel est l'identifiant du patient?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/inputs/contact/_id:label">-</span><span lang="" class="or-hint active">Select a person from list</span><input type="text" name="/nutrition_exit/inputs/contact/_id" data-type-xml="person"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/contact/date_of_birth" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_exit/inputs/contact/parent"><section class="or-group-data " name="/nutrition_exit/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_exit/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/nutrition_exit/measurements"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements:label">Exit measurements</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements:label">Mediciones de salida</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements:label">Mesures de sortie</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements:label">माप से बाहर निकलें</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements:label">Keluar dari pengukuran</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements:label">बाहिर निस्कनुहोस्</span>
</h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/gender:label">Gender</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/gender:label">Género</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/gender:label">Le sexe</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/gender:label">लिंग</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/gender:label">Jenis kelamin</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/gender:label">लिङ्ग</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_exit/measurements/gender" data-name="/nutrition_exit/measurements/gender" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/measurements/gender/male:label">Male</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/male:label">Masculino</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/male:label">Mâle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/male:label">पुरुष</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/male:label">Pria</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/male:label">नर</span></label><label class=""><input type="radio" name="/nutrition_exit/measurements/gender" data-name="/nutrition_exit/measurements/gender" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/measurements/gender/female:label">Female</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/female:label">Hembra</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/female:label">Femelle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/female:label">महिला</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/female:label">Wanita</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/measurements/gender/female:label">महिला</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/weight:label">Weight (kgs)</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/weight:label">Peso (kg)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/weight:label">poids (kg)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/weight:label">वजन (किलोग्राम)</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/weight:label">Berat (kg)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/weight:label">वजन (किलोग्राम)</span><span class="required">*</span><input type="number" name="/nutrition_exit/measurements/weight" data-required="true()" data-constraint=". &gt;= 0.8 and . &lt;= 68.5" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">Weight should be between 0.8 kg and 68.5 kg</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/weight:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/height:label">Height (cms)</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/height:label">Altura (cm)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/height:label">Hauteur (cm)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/height:label">ऊंचाई (सेंटिमीटर)</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/height:label">Tinggi (cm)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/height:label">ऊँचाई (सेमी)</span><span class="required">*</span><input type="number" name="/nutrition_exit/measurements/height" data-required="true()" data-constraint=". &gt;= 45 and . &lt;= 120" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">Height should be between 45 cm and 120 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/height:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/muac:label">MUAC Measurement</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/muac:label">Medida de muac</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/muac:label">Mesure MUAC</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/muac:label">MUAC माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/muac:label">Pengukuran MUAC</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/muac:label">MUAC माप</span><input type="number" name="/nutrition_exit/measurements/muac" data-constraint=". &gt;= 5 and . &lt;= 30" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">MUAC should be between 5 and 30 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_exit/measurements/muac:jr:constraintMsg">-</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/n_wfh:label">Weight for height: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/n_wfh:label">peso por altura: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/n_wfh:label">poids pour taille: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/n_wfh:label">वजन ऊंचाई के लिए: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/n_wfh:label">berat untuk tinggi: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/n_wfh:label">वजनको लागि वजन: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><input type="text" name="/nutrition_exit/measurements/n_wfh" data-relevant=" /nutrition_exit/measurements/weight  != '' and  /nutrition_exit/measurements/height  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/n_14:label">interpretation: &lt; -3SD [Severely Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/n_14:label">interpretación: &lt;-3SD [muy malgastada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/n_14:label">interprétation: &lt;-3SD [gravement gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/n_14:label">व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/n_14:label">interpretasi: &lt;-3SD [Sangat Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/n_14:label">व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</span><input type="text" name="/nutrition_exit/measurements/n_14" data-relevant=" /nutrition_exit/wfh  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/n_15:label">interpretation: -3SD to &lt;-2SD [Moderately Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/n_15:label">interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/n_15:label">interprétation: -3SD à &lt;-2SD [modérément gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/n_15:label">व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/n_15:label">interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/n_15:label">व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</span><input type="text" name="/nutrition_exit/measurements/n_15" data-relevant=" /nutrition_exit/wfh  &lt; -2 and  /nutrition_exit/wfh  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/n_16:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/n_16:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/n_16:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/n_16:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/n_16:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/n_16:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_exit/measurements/n_16" data-relevant=" /nutrition_exit/wfh  &lt;= 2 and  /nutrition_exit/wfh  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/measurements/n_17:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/measurements/n_17:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/measurements/n_17:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/measurements/n_17:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/measurements/n_17:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/measurements/n_17:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_exit/measurements/n_17" data-relevant=" /nutrition_exit/wfh  &gt; 2" data-type-xml="string" readonly></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/nutrition_exit/exit"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/exit:label">Exit details</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/exit:label">Detalles de salida</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/exit:label">Détails de sortie</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/exit:label">विवरण से बाहर निकलें</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/exit:label">Keluar detail</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/exit:label">बाहिर निस्कनुहोस्</span>
</h4>
<fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/exit/outcome:label">Exit outcome</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/exit/outcome:label">Salir del resultado</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/exit/outcome:label">Résultat de sortie</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/exit/outcome:label">परिणाम से बाहर निकलें</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/exit/outcome:label">Keluar dari hasil</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/exit/outcome:label">बाहिर निस्कनुहोस्</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="cured" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/cured:label">Cured</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured:label">Curado</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured:label">Guérie</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured:label">ठीक</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured:label">Sembuh</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured:label">ठीक छ</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="cured_otp" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">Cured - Transfer to OTP</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">Curado - Transferencia a OTP</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">Guéri - Transfert à l'OTP</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">ठीक - ओटीपी पर स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">Sembuh - Transfer ke OTP</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_otp:label">ठीक - ओटीपीमा स्थानान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="cured_sfp" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">Cured - Transfer to SFP</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">Curado - Transferencia a SFP</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">Guéri - Transfert à SFP</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">इलाज - एसएफपी में स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">Sembuh - Transfer ke SFP</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/cured_sfp:label">ठीक - SFP मा स्थानान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="otp" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/otp:label">Transfer to OTP</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/otp:label">Transferencia a OTP</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/otp:label">Transfert vers OTP</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/otp:label">OTP पर स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/otp:label">Transfer ke OTP</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/otp:label">ओटीपीमा स्थान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="sfp" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/sfp:label">Transfer to SFP</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sfp:label">Transferencia a SFP</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sfp:label">Transfert vers SFP</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sfp:label">एसएफपी में स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sfp:label">Transfer ke SFP</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sfp:label">SFP मा स्थानान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="sc" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/sc:label">Transfer to SC</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sc:label">Transferencia a SC</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sc:label">Transfert à SC</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sc:label">SC में ट्रांसफर</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sc:label">Transfer ke SC</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/sc:label">SC मा स्थानान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="different_site" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/different_site:label">Transfer to a different site for the same program</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/different_site:label">Transferencia a un sitio diferente para el mismo programa</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/different_site:label">Transfert sur un site différent pour le même programme</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/different_site:label">एक ही कार्यक्रम के लिए एक अलग साइट पर स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/different_site:label">Transfer ke situs lain untuk program yang sama</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/different_site:label">एउटै कार्यक्रमको लागि फरक साइटमा स्थानान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="nonresponsive" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">Non-responsive (non-recovered)</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">No responde (no se recupera)</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">Non réactif (non récupéré)</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">गैर-उत्तरदायी (गैर-पुनर्प्राप्त)</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">Non-responsif (tidak dipulihkan)</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/nonresponsive:label">गैर-उत्तरदायी (गैर-बरामद गरिएको)</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="dead" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/dead:label">Dead</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/dead:label">Muerto</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/dead:label">Mort</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/dead:label">मृत</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/dead:label">Mati</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/dead:label">मृत</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/outcome" data-name="/nutrition_exit/exit/outcome" value="defaulter" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">Defaulter</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">Moroso</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">Défaillant</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">दोषी</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">Defaulter</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/outcome/defaulter:label">Defaulter</span></label>
</div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/exit/enrollment:label">Enrollment date: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/exit/enrollment:label">Fecha de inscripción: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/exit/enrollment:label">Date d'inscription: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/exit/enrollment:label">नामांकन तिथि: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/exit/enrollment:label">Tanggal pendaftaran: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/exit/enrollment:label">नामांकन मिति: <span class="or-output" data-value=" /nutrition_exit/enrollment_date "> </span></span><input type="text" name="/nutrition_exit/exit/enrollment" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/exit/stay:label">Length of stay in days: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/exit/stay:label">Duración de la estancia en días: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/exit/stay:label">Durée du séjour en jours: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/exit/stay:label">दिनों में रहने की लंबाई: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/exit/stay:label">Lama menginap dalam hari: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/exit/stay:label">दिनहरूमा रहनको लम्बाइ: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><input type="text" name="/nutrition_exit/exit/stay" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_exit/exit/enroll:label">Do you need to enroll <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> in another treatment enrollment program</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/exit/enroll:label">¿Necesita inscribir <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> en otro programa de inscripción de tratamiento?</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/exit/enroll:label">Devez-vous inscrire <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> dans un autre programme d'inscription à un traitement?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/exit/enroll:label">क्या आपको किसी अन्य उपचार नामांकन कार्यक्रम में <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> को नामांकित करने की आवश्यकता है</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/exit/enroll:label">Apakah Anda perlu mendaftarkan <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> dalam program pendaftaran perawatan lain</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/exit/enroll:label">तपाईंलाई <span class="or-output" data-value=" /nutrition_exit/patient_name "> </span> नामाकरण गर्न आवश्यक छ अर्को उपचार नामांकन कार्यक्रममा</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_exit/exit/enroll" data-name="/nutrition_exit/exit/enroll" value="yes" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/enroll/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/yes:label">Sí</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/yes:label">iya nih</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/yes:label">हो</span></label><label class=""><input type="radio" name="/nutrition_exit/exit/enroll" data-name="/nutrition_exit/exit/enroll" value="no" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_exit/exit/enroll/no:label">No</span><span lang="es" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/no:label">No</span><span lang="fr" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/nutrition_exit/exit/enroll/no:label">होइन</span></label>
</div>
</fieldset></fieldset>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/nutrition_exit/summary"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_2:label"><h4 style="text-align:center;"><span class="or-output" data-value=" /nutrition_exit/patient_name "> </span></h4></span><input type="text" name="/nutrition_exit/summary/n_2" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_4:label">Gender: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_4:label">Género: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_4:label">Le sexe: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_4:label">लिंग: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_4:label">Jenis kelamin: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_4:label">लिङ्ग: <span class="or-output" data-value=" /nutrition_exit/measurements/gender "> </span></span><input type="text" name="/nutrition_exit/summary/n_4" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_6:label">Weight: <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> kg</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_6:label">peso <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> kg</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_6:label">poids <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> kg</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_6:label">वजन <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> किलो</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_6:label">berat <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> kg</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_6:label">वजन <span class="or-output" data-value=" /nutrition_exit/measurements/weight "> </span> किलो</span><input type="text" name="/nutrition_exit/summary/n_6" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_7:label">Height: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> cm</span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_7:label">Altura: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> cm</span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_7:label">Hauteur: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> cm</span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_7:label">ऊंचाई: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> सेमी</span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_7:label">Tinggi: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> cm</span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_7:label">ऊँचाई: <span class="or-output" data-value=" /nutrition_exit/measurements/height "> </span> सेमी</span><input type="text" name="/nutrition_exit/summary/n_7" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_9:label">Weight for height z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_9:label">Peso para la altura z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_9:label">Poids pour la taille z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_9:label">ऊंचाई के लिए वजन z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_9:label">Berat untuk tinggi z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_9:label">उचाईको लागि वजन z-score: <span class="or-output" data-value=" /nutrition_exit/wfh "> </span></span><input type="text" name="/nutrition_exit/summary/n_9" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_10:label">Exit outcome: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_10:label">Salir del resultado: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_10:label">Résultat de sortie: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_10:label">परिणाम से बाहर निकलें: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_10:label">Keluar dari hasil: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_10:label">बाहिर निस्कनुहोस्: <span class="or-output" data-value=" /nutrition_exit/exit/outcome "> </span></span><input type="text" name="/nutrition_exit/summary/n_10" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_11:label">Length of stay in days: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_11:label">Duración de la estancia en días: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_11:label">Durée du séjour en jours: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_11:label">दिनों में रहने की लंबाई: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_11:label">Lama menginap dalam hari: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_11:label">दिनहरूमा रहनको लम्बाइ: <span class="or-output" data-value=" /nutrition_exit/exit/length_stay "> </span></span><input type="text" name="/nutrition_exit/summary/n_11" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_exit/summary/n_12:label">Enroll in another program: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_exit/summary/n_12:label">Inscríbase en otro programa: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_exit/summary/n_12:label">Inscrivez-vous à un autre programme: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_exit/summary/n_12:label">दूसरे कार्यक्रम में दाखिला लें: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_exit/summary/n_12:label">Daftar di program lain: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_exit/summary/n_12:label">अर्को कार्यक्रममा नामाकरण गर्नुहोस्: <span class="or-output" data-value=" /nutrition_exit/exit/enroll "> </span></span><input type="text" name="/nutrition_exit/summary/n_12" data-relevant=" /nutrition_exit/exit/outcome  = 'cured'" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/nutrition_exit/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/enrollment_date" data-calculate="instance('contact-summary')/context/enrollment_date" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/treatment_program" data-calculate="instance('contact-summary')/context/treatment_program" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/wfh" data-calculate="round(z-score('weight-for-height',  /nutrition_exit/measurements/gender ,  /nutrition_exit/measurements/height ,  /nutrition_exit/measurements/weight ), 1)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/exit/length_stay" data-calculate="int(decimal-date-time(today()) - decimal-date-time(date( /nutrition_exit/enrollment_date )))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_exit/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <nutrition_exit xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="nutrition_exit" prefix="J1!nutrition_exit!" version="2019-05-10 09-48">
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
          <enrollment_date/>
          <treatment_program/>
          <wfh/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
            <n_wfh/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
          </measurements>
          <exit>
            <outcome/>
            <enrollment/>
            <length_stay/>
            <stay/>
            <enroll/>
          </exit>
          <summary>
            <n_2/>
            <n_4/>
            <n_6/>
            <n_7/>
            <n_9/>
            <n_10/>
            <n_11/>
            <n_12/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_exit>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Child nutrition treatment exit</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>Yes</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>Do you need to enroll <output value=" /nutrition_exit/patient_name "/> in another treatment enrollment program</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>Enrollment date: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>Cured</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>Cured - Transfer to OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>Cured - Transfer to SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>Dead</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>Defaulter</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>Transfer to a different site for the same program</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>Non-responsive (non-recovered)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>Transfer to OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>Transfer to SC</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>Transfer to SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>Exit outcome</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>Length of stay in days: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>Exit details</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>Female</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>Male</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>Gender</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>Height should be between 45 cm and 120 cm</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>Height (cms)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>MUAC should be between 5 and 30 cm</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>MUAC Measurement</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>interpretation: &lt; -3SD [Severely Wasted]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Wasted]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>Weight for height: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>Weight should be between 0.8 kg and 68.5 kg</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>Weight (kgs)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>Exit measurements</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>Exit outcome: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>Length of stay in days: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>Enroll in another program: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>Gender: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>Weight: <output value=" /nutrition_exit/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>Height: <output value=" /nutrition_exit/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>Weight for height z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>Sí</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>¿Necesita inscribir <output value=" /nutrition_exit/patient_name "/> en otro programa de inscripción de tratamiento?</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>Fecha de inscripción: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>Curado</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>Curado - Transferencia a OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>Curado - Transferencia a SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>Muerto</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>Moroso</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>Transferencia a un sitio diferente para el mismo programa</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>No responde (no se recupera)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>Transferencia a OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>Transferencia a SC</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>Transferencia a SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>Salir del resultado</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>Duración de la estancia en días: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>Detalles de salida</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>Hembra</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>Masculino</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>Género</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>Altura (cm)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>Medida de muac</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>interpretación: &lt;-3SD [muy malgastada]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>peso por altura: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>Peso (kg)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>Mediciones de salida</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>Salir del resultado: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>Duración de la estancia en días: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>Inscríbase en otro programa: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>Género: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>peso <output value=" /nutrition_exit/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>Altura: <output value=" /nutrition_exit/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>Peso para la altura z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>Non</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>Oui</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>Devez-vous inscrire <output value=" /nutrition_exit/patient_name "/> dans un autre programme d'inscription à un traitement?</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>Date d'inscription: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>Guérie</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>Guéri - Transfert à l'OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>Guéri - Transfert à SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>Mort</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>Défaillant</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>Transfert sur un site différent pour le même programme</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>Non réactif (non récupéré)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>Transfert vers OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>Transfert à SC</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>Transfert vers SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>Résultat de sortie</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>Durée du séjour en jours: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>Détails de sortie</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>Quel est l'identifiant du patient?</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>Femelle</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>Mâle</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>Le sexe</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>Hauteur (cm)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>Mesure MUAC</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>interprétation: &lt;-3SD [gravement gaspillé]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>interprétation: -3SD à &lt;-2SD [modérément gaspillé]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>poids pour taille: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>poids (kg)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>Mesures de sortie</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>Résultat de sortie: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>Durée du séjour en jours: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>Inscrivez-vous à un autre programme: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>Le sexe: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>poids <output value=" /nutrition_exit/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>Hauteur: <output value=" /nutrition_exit/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>Poids pour la taille z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>नहीं</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>क्या आपको किसी अन्य उपचार नामांकन कार्यक्रम में <output value=" /nutrition_exit/patient_name "/> को नामांकित करने की आवश्यकता है</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>नामांकन तिथि: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>ठीक</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>ठीक - ओटीपी पर स्थानांतरण</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>इलाज - एसएफपी में स्थानांतरण</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>मृत</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>दोषी</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>एक ही कार्यक्रम के लिए एक अलग साइट पर स्थानांतरण</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>गैर-उत्तरदायी (गैर-पुनर्प्राप्त)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>OTP पर स्थानांतरण</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>SC में ट्रांसफर</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>एसएफपी में स्थानांतरण</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>परिणाम से बाहर निकलें</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>दिनों में रहने की लंबाई: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>विवरण से बाहर निकलें</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>पुरुष</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>लिंग</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>ऊंचाई (सेंटिमीटर)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>वजन ऊंचाई के लिए: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>माप से बाहर निकलें</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>परिणाम से बाहर निकलें: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>दिनों में रहने की लंबाई: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>दूसरे कार्यक्रम में दाखिला लें: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>लिंग: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>वजन <output value=" /nutrition_exit/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>ऊंचाई: <output value=" /nutrition_exit/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>ऊंचाई के लिए वजन z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>Tidak</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>iya nih</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>Apakah Anda perlu mendaftarkan <output value=" /nutrition_exit/patient_name "/> dalam program pendaftaran perawatan lain</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>Tanggal pendaftaran: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>Sembuh</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>Sembuh - Transfer ke OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>Sembuh - Transfer ke SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>Mati</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>Defaulter</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>Transfer ke situs lain untuk program yang sama</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>Non-responsif (tidak dipulihkan)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>Transfer ke OTP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>Transfer ke SC</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>Transfer ke SFP</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>Keluar dari hasil</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>Lama menginap dalam hari: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>Keluar detail</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>Wanita</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>Pria</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>Jenis kelamin</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>Tinggi (cm)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>Pengukuran MUAC</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>interpretasi: &lt;-3SD [Sangat Terbuang]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>berat untuk tinggi: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>Berat (kg)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>Keluar dari pengukuran</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>Keluar dari hasil: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>Lama menginap dalam hari: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>Daftar di program lain: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>Jenis kelamin: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>berat <output value=" /nutrition_exit/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>Tinggi: <output value=" /nutrition_exit/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>Berat untuk tinggi z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/nutrition_exit/exit/enroll/no:label">
            <value>होइन</value>
          </text>
          <text id="/nutrition_exit/exit/enroll/yes:label">
            <value>हो</value>
          </text>
          <text id="/nutrition_exit/exit/enroll:label">
            <value>तपाईंलाई <output value=" /nutrition_exit/patient_name "/> नामाकरण गर्न आवश्यक छ अर्को उपचार नामांकन कार्यक्रममा</value>
          </text>
          <text id="/nutrition_exit/exit/enrollment:label">
            <value>नामांकन मिति: <output value=" /nutrition_exit/enrollment_date "/></value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured:label">
            <value>ठीक छ</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_otp:label">
            <value>ठीक - ओटीपीमा स्थानान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/cured_sfp:label">
            <value>ठीक - SFP मा स्थानान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/dead:label">
            <value>मृत</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/defaulter:label">
            <value>Defaulter</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/different_site:label">
            <value>एउटै कार्यक्रमको लागि फरक साइटमा स्थानान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/nonresponsive:label">
            <value>गैर-उत्तरदायी (गैर-बरामद गरिएको)</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/otp:label">
            <value>ओटीपीमा स्थान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sc:label">
            <value>SC मा स्थानान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome/sfp:label">
            <value>SFP मा स्थानान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/outcome:label">
            <value>बाहिर निस्कनुहोस्</value>
          </text>
          <text id="/nutrition_exit/exit/stay:label">
            <value>दिनहरूमा रहनको लम्बाइ: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/exit:label">
            <value>बाहिर निस्कनुहोस्</value>
          </text>
          <text id="/nutrition_exit/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_exit/measurements/gender/male:label">
            <value>नर</value>
          </text>
          <text id="/nutrition_exit/measurements/gender:label">
            <value>लिङ्ग</value>
          </text>
          <text id="/nutrition_exit/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/height:label">
            <value>ऊँचाई (सेमी)</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_exit/measurements/n_14:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_15:label">
            <value>व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_16:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_17:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_exit/measurements/n_wfh:label">
            <value>वजनको लागि वजन: <output value=" /nutrition_exit/wfh "/></value>
          </text>
          <text id="/nutrition_exit/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_exit/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_exit/measurements:label">
            <value>बाहिर निस्कनुहोस्</value>
          </text>
          <text id="/nutrition_exit/summary/n_10:label">
            <value>बाहिर निस्कनुहोस्: <output value=" /nutrition_exit/exit/outcome "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_11:label">
            <value>दिनहरूमा रहनको लम्बाइ: <output value=" /nutrition_exit/exit/length_stay "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_12:label">
            <value>अर्को कार्यक्रममा नामाकरण गर्नुहोस्: <output value=" /nutrition_exit/exit/enroll "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_2:label">
            <value>&lt;h4 style=&quot;text-align:center;&quot;&gt;<output value=" /nutrition_exit/patient_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_exit/summary/n_4:label">
            <value>लिङ्ग: <output value=" /nutrition_exit/measurements/gender "/></value>
          </text>
          <text id="/nutrition_exit/summary/n_6:label">
            <value>वजन <output value=" /nutrition_exit/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_exit/summary/n_7:label">
            <value>ऊँचाई: <output value=" /nutrition_exit/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_exit/summary/n_9:label">
            <value>उचाईको लागि वजन z-score: <output value=" /nutrition_exit/wfh "/></value>
          </text>
        </translation>
      </itext>
      <instance>
        <nutrition_exit delimiter="#" id="nutrition_exit" prefix="J1!nutrition_exit!" version="2019-05-10 09-48">
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
          <enrollment_date/>
          <treatment_program/>
          <wfh/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
            <n_wfh/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
          </measurements>
          <exit>
            <outcome/>
            <enrollment/>
            <length_stay/>
            <stay/>
            <enroll/>
          </exit>
          <summary>
            <n_2/>
            <n_4/>
            <n_6/>
            <n_7/>
            <n_9/>
            <n_10/>
            <n_11/>
            <n_12/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_exit>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/nutrition_exit/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/nutrition_exit/inputs/source" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/source_id" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/nutrition_exit/inputs/contact/name" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/nutrition_exit/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/nutrition_exit/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/nutrition_exit/patient_name" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/nutrition_exit/patient_id" type="string"/>
      <bind calculate="instance('contact-summary')/context/enrollment_date" nodeset="/nutrition_exit/enrollment_date" type="string"/>
      <bind calculate="instance('contact-summary')/context/treatment_program" nodeset="/nutrition_exit/treatment_program" type="string"/>
      <bind calculate="round(z-score('weight-for-height',  /nutrition_exit/measurements/gender ,  /nutrition_exit/measurements/height ,  /nutrition_exit/measurements/weight ), 1)" nodeset="/nutrition_exit/wfh" type="string"/>
      <bind nodeset="/nutrition_exit/measurements/gender" required="true()" type="select1"/>
      <bind constraint=". &gt;= 0.8 and . &lt;= 68.5" jr:constraintMsg="jr:itext('/nutrition_exit/measurements/weight:jr:constraintMsg')" nodeset="/nutrition_exit/measurements/weight" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 45 and . &lt;= 120" jr:constraintMsg="jr:itext('/nutrition_exit/measurements/height:jr:constraintMsg')" nodeset="/nutrition_exit/measurements/height" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 5 and . &lt;= 30" jr:constraintMsg="jr:itext('/nutrition_exit/measurements/muac:jr:constraintMsg')" nodeset="/nutrition_exit/measurements/muac" required="false()" type="decimal"/>
      <bind nodeset="/nutrition_exit/measurements/n_wfh" readonly="true()" relevant=" /nutrition_exit/measurements/weight  != '' and  /nutrition_exit/measurements/height  != ''" type="string"/>
      <bind nodeset="/nutrition_exit/measurements/n_14" readonly="true()" relevant=" /nutrition_exit/wfh  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_exit/measurements/n_15" readonly="true()" relevant=" /nutrition_exit/wfh  &lt; -2 and  /nutrition_exit/wfh  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_exit/measurements/n_16" readonly="true()" relevant=" /nutrition_exit/wfh  &lt;= 2 and  /nutrition_exit/wfh  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_exit/measurements/n_17" readonly="true()" relevant=" /nutrition_exit/wfh  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_exit/exit/outcome" type="select1"/>
      <bind nodeset="/nutrition_exit/exit/enrollment" readonly="true()" relevant=" /nutrition_exit/exit/outcome  = 'cured'" type="string"/>
      <bind calculate="int(decimal-date-time(today()) - decimal-date-time(date( /nutrition_exit/enrollment_date )))" nodeset="/nutrition_exit/exit/length_stay" type="string"/>
      <bind nodeset="/nutrition_exit/exit/stay" readonly="true()" relevant=" /nutrition_exit/exit/outcome  = 'cured'" type="string"/>
      <bind nodeset="/nutrition_exit/exit/enroll" relevant=" /nutrition_exit/exit/outcome  = 'cured'" type="select1"/>
      <bind nodeset="/nutrition_exit/summary/n_2" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_4" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_6" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_7" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_9" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_10" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_11" readonly="true()" relevant=" /nutrition_exit/exit/outcome  = 'cured'" type="string"/>
      <bind nodeset="/nutrition_exit/summary/n_12" readonly="true()" relevant=" /nutrition_exit/exit/outcome  = 'cured'" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/nutrition_exit/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/nutrition_exit/inputs">
      <label ref="jr:itext('/nutrition_exit/inputs:label')"/>
      <input appearance="hidden" ref="/nutrition_exit/inputs/source"/>
      <input appearance="hidden" ref="/nutrition_exit/inputs/source_id"/>
      <group ref="/nutrition_exit/inputs/contact">
        <input appearance="db-object" ref="/nutrition_exit/inputs/contact/_id">
          <label ref="jr:itext('/nutrition_exit/inputs/contact/_id:label')"/>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/nutrition_exit/inputs/contact/name"/>
        <input appearance="hidden" ref="/nutrition_exit/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/nutrition_exit/inputs/contact/date_of_birth"/>
        <group ref="/nutrition_exit/inputs/contact/parent">
          <group ref="/nutrition_exit/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/nutrition_exit/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/nutrition_exit/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/nutrition_exit/measurements">
      <label ref="jr:itext('/nutrition_exit/measurements:label')"/>
      <select1 ref="/nutrition_exit/measurements/gender">
        <label ref="jr:itext('/nutrition_exit/measurements/gender:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_exit/measurements/gender/male:label')"/>
          <value>male</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/measurements/gender/female:label')"/>
          <value>female</value>
        </item>
      </select1>
      <input ref="/nutrition_exit/measurements/weight">
        <label ref="jr:itext('/nutrition_exit/measurements/weight:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/height">
        <label ref="jr:itext('/nutrition_exit/measurements/height:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/muac">
        <label ref="jr:itext('/nutrition_exit/measurements/muac:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/n_wfh">
        <label ref="jr:itext('/nutrition_exit/measurements/n_wfh:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/n_14">
        <label ref="jr:itext('/nutrition_exit/measurements/n_14:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/n_15">
        <label ref="jr:itext('/nutrition_exit/measurements/n_15:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/n_16">
        <label ref="jr:itext('/nutrition_exit/measurements/n_16:label')"/>
      </input>
      <input ref="/nutrition_exit/measurements/n_17">
        <label ref="jr:itext('/nutrition_exit/measurements/n_17:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/nutrition_exit/exit">
      <label ref="jr:itext('/nutrition_exit/exit:label')"/>
      <select1 ref="/nutrition_exit/exit/outcome">
        <label ref="jr:itext('/nutrition_exit/exit/outcome:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/cured:label')"/>
          <value>cured</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/cured_otp:label')"/>
          <value>cured_otp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/cured_sfp:label')"/>
          <value>cured_sfp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/otp:label')"/>
          <value>otp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/sfp:label')"/>
          <value>sfp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/sc:label')"/>
          <value>sc</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/different_site:label')"/>
          <value>different_site</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/nonresponsive:label')"/>
          <value>nonresponsive</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/dead:label')"/>
          <value>dead</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/outcome/defaulter:label')"/>
          <value>defaulter</value>
        </item>
      </select1>
      <input ref="/nutrition_exit/exit/enrollment">
        <label ref="jr:itext('/nutrition_exit/exit/enrollment:label')"/>
      </input>
      <input ref="/nutrition_exit/exit/stay">
        <label ref="jr:itext('/nutrition_exit/exit/stay:label')"/>
      </input>
      <select1 ref="/nutrition_exit/exit/enroll">
        <label ref="jr:itext('/nutrition_exit/exit/enroll:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/enroll/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_exit/exit/enroll/no:label')"/>
          <value>no</value>
        </item>
      </select1>
    </group>
    <group appearance="field-list summary" ref="/nutrition_exit/summary">
      <input ref="/nutrition_exit/summary/n_2">
        <label ref="jr:itext('/nutrition_exit/summary/n_2:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_4">
        <label ref="jr:itext('/nutrition_exit/summary/n_4:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_6">
        <label ref="jr:itext('/nutrition_exit/summary/n_6:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_7">
        <label ref="jr:itext('/nutrition_exit/summary/n_7:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_9">
        <label ref="jr:itext('/nutrition_exit/summary/n_9:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_10">
        <label ref="jr:itext('/nutrition_exit/summary/n_10:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_11">
        <label ref="jr:itext('/nutrition_exit/summary/n_11:label')"/>
      </input>
      <input ref="/nutrition_exit/summary/n_12">
        <label ref="jr:itext('/nutrition_exit/summary/n_12:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
