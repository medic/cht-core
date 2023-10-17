/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="nutrition_screening">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Nutrition screening</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="es">es</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> </select>
  
  
    <section class="or-group or-branch pre-init or-appearance-field-list " name="/nutrition_screening/inputs" data-relevant="./source = 'user'"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/inputs:label">Patient</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/inputs:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/inputs:label">Patient</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/inputs:label">मरीज</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/inputs:label">Pasien</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/inputs:label">-</span>
</h4>
<label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/source" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/source_id" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_screening/inputs/contact"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/inputs/contact/_id:label">What is the patient's name?</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/inputs/contact/_id:label">-</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/inputs/contact/_id:label">Quel est l'identifiant du patient?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/inputs/contact/_id:label">मरीज का नाम क्या है?</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/inputs/contact/_id:label">Apa nama pasien?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/inputs/contact/_id:label">-</span><span lang="" class="or-hint active">Select a person from list</span><input type="text" name="/nutrition_screening/inputs/contact/_id" data-type-xml="person"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/contact/patient_id" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/contact/date_of_birth" data-type-xml="string"></label><section class="or-group-data " name="/nutrition_screening/inputs/contact/parent"><section class="or-group-data " name="/nutrition_screening/inputs/contact/parent/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/contact/parent/contact/phone" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/nutrition_screening/inputs/contact/parent/contact/name" data-type-xml="string"></label>
      </section>
      </section>
      </section>
      </section>
    <section class="or-group or-appearance-field-list " name="/nutrition_screening/measurements"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/measurements:label">Measurements</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/measurements:label">Mediciones</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/measurements:label">Des mesures</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/measurements:label">माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/measurements:label">Pengukuran</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/measurements:label">माप</span>
</h4>
<fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/measurements/gender:label">Gender</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/measurements/gender:label">Género</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/measurements/gender:label">Le sexe</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/measurements/gender:label">लिंग</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/measurements/gender:label">Jenis kelamin</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/measurements/gender:label">लिङ्ग</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/measurements/gender" data-name="/nutrition_screening/measurements/gender" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/measurements/gender/male:label">Male</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/male:label">Masculino</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/male:label">Mâle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/male:label">पुरुष</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/male:label">Pria</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/male:label">नर</span></label><label class=""><input type="radio" name="/nutrition_screening/measurements/gender" data-name="/nutrition_screening/measurements/gender" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/measurements/gender/female:label">Female</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/female:label">Hembra</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/female:label">Femelle</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/female:label">महिला</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/female:label">Wanita</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/measurements/gender/female:label">महिला</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/measurements/weight:label">Weight (kg)</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/measurements/weight:label">Peso (kg)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/measurements/weight:label">poids (kg)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/measurements/weight:label">वजन (किलोग्राम)</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/measurements/weight:label">Berat (kg)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/measurements/weight:label">वजन (किलोग्राम)</span><span class="required">*</span><input type="number" name="/nutrition_screening/measurements/weight" data-required="true()" data-constraint=". &gt;= 0.8 and . &lt;= 68.5" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">Weight should be between 0.8 kg and 68.5 kg</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/weight:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/measurements/height:label">Height (cm)</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/measurements/height:label">Altura (cm)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/measurements/height:label">Hauteur (cm)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/measurements/height:label">ऊंचाई (सेंटिमीटर)</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/measurements/height:label">Tinggi (cm)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/measurements/height:label">ऊँचाई (सेमी)</span><span class="required">*</span><input type="number" name="/nutrition_screening/measurements/height" data-required="true()" data-constraint=". &gt;= 45 and . &lt;= 120" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">Height should be between 45 cm and 120 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/height:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/measurements/muac:label">MUAC Measurement</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/measurements/muac:label">Medida de muac</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/measurements/muac:label">Mesure MUAC</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/measurements/muac:label">MUAC माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/measurements/muac:label">Pengukuran MUAC</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/measurements/muac:label">MUAC माप</span><input type="number" name="/nutrition_screening/measurements/muac" data-constraint=". &gt;= 5 and . &lt;= 30" data-relevant=" /nutrition_screening/age_in_days  &gt;= 180" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">MUAC should be between 5 and 30 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_screening/measurements/muac:jr:constraintMsg">-</span></label>
      </section>
    <section class="or-group or-appearance-field-list " name="/nutrition_screening/treatment"><h4>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment:label">Interpretation</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment:label">Interpretación</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment:label">Interprétation</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment:label">व्याख्या</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment:label">Interpretasi</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment:label">व्याख्या</span>
</h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_zscore:label">z-score measurements</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_zscore:label">mediciones de puntuación z</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_zscore:label">mesures z-score</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_zscore:label">z- स्कोर माप</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_zscore:label">pengukuran z-skor</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_zscore:label">z-score माप</span><input type="text" name="/nutrition_screening/treatment/n_zscore" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa:label">weight for age: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa:label">peso por edad: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa:label">poids pour l'âge: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa:label">उम्र के लिए वजन: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa:label">berat untuk usia: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa:label">वजनको लागि उमेर: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><input type="text" name="/nutrition_screening/treatment/n_wfa" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">interpretation: &lt; -3SD [Severely Malnourished]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">interpretación: &lt;-3SD [desnutrida severa]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">interprétation: &lt;-3SD [gravement malnutri]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">व्याख्या: &lt;-3SD [गंभीर रूप से कुपोषित]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">interpretasi: &lt;-3SD [Malnutrisi Berat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">व्याख्या: &lt;-3 एसडी [अत्यधिक माक्र्सित]</span><input type="text" name="/nutrition_screening/treatment/n_wfa_s_malnourished" data-relevant=" /nutrition_screening/wfa  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">interpretation: -3SD to &lt; -2SD [Moderately Malnourished]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">interpretación: -3SD a &lt;-2SD [malnutridos moderados]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">interprétation: -3SD à &lt;-2SD [Modérément mal nourris]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से कुपोषित]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">interpretasi: -3SD hingga &lt;-2SD [Kurang gizi]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">व्याख्या: -3 एसडी &lt;&lt;एसडीडी [मातृभाषी पोषण गर्ने]</span><input type="text" name="/nutrition_screening/treatment/n_wfa_m_malnourished" data-relevant=" /nutrition_screening/wfa  &lt; -2 and  /nutrition_screening/wfa  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_normal:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/treatment/n_wfa_normal" data-relevant=" /nutrition_screening/wfa  &lt;= 2 and  /nutrition_screening/wfa  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_overweight:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_screening/treatment/n_wfa_overweight" data-relevant=" /nutrition_screening/wfa  &gt; 2 and  /nutrition_screening/wfa  &lt;= 3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">interpretation: &gt;3SD [Obese]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">interpretación:&gt; 3SD [Obeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">interprétation:&gt; 3SD [Obèse]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">व्याख्या:&gt; 3SD [मोटापा]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">interpretasi:&gt; 3SD [Obese]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfa_obese:label">व्याख्या:&gt; 3 एसडी [Obese]</span><input type="text" name="/nutrition_screening/treatment/n_wfa_obese" data-relevant=" /nutrition_screening/wfa  &gt; 3" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_hfa:label">height for age: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa:label">Altura por edad: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa:label">taille pour l'âge: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa:label">उम्र के लिए ऊंचाई: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa:label">tinggi untuk usia: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa:label">उमेरको लागि उचाई: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><input type="text" name="/nutrition_screening/treatment/n_hfa" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">interpretation: &lt; -3SD [Severely Stunted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">interpretación: &lt;-3SD [severamente atrofiado]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">interprétation: &lt;-3SD [sévèrement stunté]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">व्याख्या: &lt;-3SD [गंभीर रूप से टूटी हुई]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">interpretasi: &lt;-3SD [Sangat terhambat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_s_stunted:label">व्याख्या: &lt;-3 एसडी [गंभीर रूप देखि चुपके]</span><input type="text" name="/nutrition_screening/treatment/n_hfa_s_stunted" data-relevant=" /nutrition_screening/hfa  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">interpretation: -3SD to &lt;-2SD [Moderately Stunted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">Interpretación: -3SD a &lt;-2SD [moderadamente atrofiado]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">interprétation: -3SD à &lt;-2SD [Modérément retardé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से अटका]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">interpretasi: -3SD hingga &lt;-2SD [Cukup terhambat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_m_stunted:label">व्याख्या: -3 एसडी &lt;-2 एसडी [मध्य स्टंट गरिएको]</span><input type="text" name="/nutrition_screening/treatment/n_hfa_m_stunted" data-relevant=" /nutrition_screening/hfa  &lt; -2 and  /nutrition_screening/hfa  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_stunted:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/treatment/n_hfa_stunted" data-relevant=" /nutrition_screening/hfa  &lt;= 2 and  /nutrition_screening/hfa  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">interpretation: &gt;2SD [High]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">interpretación:&gt; 2SD [Alta]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">interprétation:&gt; 2SD [Elevé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">व्याख्या:&gt; 2SD [उच्च]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">interpretasi:&gt; 2SD [Tinggi]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_hfa_high:label">व्याख्या:&gt; 2 एसडी [उच्च]</span><input type="text" name="/nutrition_screening/treatment/n_hfa_high" data-relevant=" /nutrition_screening/hfa  &gt; 2" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfh:label">weight for height: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh:label">peso por altura: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh:label">poids pour taille: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh:label">वजन ऊंचाई के लिए: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh:label">berat untuk tinggi: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh:label">वजनको लागि वजन: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><input type="text" name="/nutrition_screening/treatment/n_wfh" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">interpretation: &lt; -3SD [Severely Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">interpretación: &lt;-3SD [muy malgastada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">interprétation: &lt;-3SD [gravement gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">interpretasi: &lt;-3SD [Sangat Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_s_wasted:label">व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</span><input type="text" name="/nutrition_screening/treatment/n_wfh_s_wasted" data-relevant=" /nutrition_screening/wfh  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">interpretation: -3SD to &lt;-2SD [Moderately Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">interprétation: -3SD à &lt;-2SD [modérément gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_m_wasted:label">व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</span><input type="text" name="/nutrition_screening/treatment/n_wfh_m_wasted" data-relevant=" /nutrition_screening/wfh  &lt; -2 and  /nutrition_screening/wfh  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_normal:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/treatment/n_wfh_normal" data-relevant=" /nutrition_screening/wfh  &lt;= 2 and  /nutrition_screening/wfh  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_wfh_overwweight:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_screening/treatment/n_wfh_overwweight" data-relevant=" /nutrition_screening/wfh  &gt; 2" data-type-xml="string" readonly></label><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/enroll:label">Do you want to enroll into a treatment program?</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/enroll:label">¿Quieres inscribirte en un programa de tratamiento?</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/enroll:label">Voulez-vous vous inscrire à un programme de traitement?</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/enroll:label">क्या आप एक उपचार कार्यक्रम में दाखिला लेना चाहते हैं?</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/enroll:label">Apakah Anda ingin mendaftar ke program perawatan?</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/enroll:label">के तपाइँ एक उपचार कार्यक्रममा नामाकरण गर्न चाहनुहुन्छ?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/treatment/enroll" data-name="/nutrition_screening/treatment/enroll" value="yes" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/enroll/yes:label">Yes</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/yes:label">Sí</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/yes:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/yes:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/yes:label">iya nih</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/yes:label">हो</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/enroll" data-name="/nutrition_screening/treatment/enroll" value="no" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/enroll/no:label">No</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/no:label">No</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/no:label">Non</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/no:label">नहीं</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/no:label">Tidak</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/enroll/no:label">होइन</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/reason:label">Reason for non-enrollment</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/reason:label">Razones para no inscribirse</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/reason:label">Raisons de la non-inscription</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/reason:label">नामांकन न करने के कारण</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/reason:label">Alasan tidak mendaftar</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/reason:label">गैर नामांकनको कारण</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/treatment/reason" data-name="/nutrition_screening/treatment/reason" value="false_positive" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">False positive</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">Falso positivo</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">Faux positif</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">सकारात्मक झूठी</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">Salah positif</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/false_positive:label">झूटा सकारात्मक</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/reason" data-name="/nutrition_screening/treatment/reason" value="chronic_malnutrition" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">Chronic malnutrition</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">Desnutricion cronica</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">Malnutrition chronique</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">जीर्ण कुपोषण</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">Malnutrisi kronis</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">पुरानो कुपोषण</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/reason" data-name="/nutrition_screening/treatment/reason" value="status_check" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'no'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/reason/status_check:label">Nutrition status check</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/status_check:label">Verificación del estado nutricional</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/status_check:label">Vérification de l'état nutritionnel</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/status_check:label">पोषण की स्थिति की जाँच</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/status_check:label">Pemeriksaan status gizi</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/reason/status_check:label">पोषण स्थिति जाँच</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/admission_type:label">Type of admission</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_type:label">Tipo de ingreso</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_type:label">Type d'admission</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_type:label">प्रवेश का प्रकार</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_type:label">Jenis penerimaan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_type:label">प्रवेशको प्रकार</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="new_case" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">New case</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">Nuevo caso</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">Nouveau cas</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">नया केस</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">Kasus baru</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/new_case:label">नयाँ मामला</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="relapse" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">Relapse/Readmission</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">Recaída / Readmisión</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">Rechute / Réadmission</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">पलटा / पुनः भर्ती</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">Relaps / Penerimaan</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/relapse:label">छुट / दर्ता</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="otp" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">Transfer from Outpatient Therapeutic Programme</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">Transferencia del programa terapéutico ambulatorio</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">Transfert du programme thérapeutique ambulatoire</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">आउट पेशेंट चिकित्सीय कार्यक्रम से स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">Transfer dari Program Terapi Rawat Jalan</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/otp:label">आउटपेटेंट चिकित्सीय कार्यक्रमबाट स्थान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="sfp" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">Transfer from Supplementary Feeding Programme</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">Transferencia del Programa de Alimentación Suplementaria</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">Transfert du programme d'alimentation supplémentaire</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">अनुपूरक फीडिंग कार्यक्रम से स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">Transfer dari Program Pemberian Makanan Tambahan</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sfp:label">पूरक फिडिंग कार्यक्रमबाट स्थान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="sc" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">Transfer from Stabilization Center</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">Traslado desde el centro de estabilización</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">Transfert du centre de stabilisation</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">स्थिरीकरण केंद्र से स्थानांतरण</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">Transfer dari Pusat Stabilisasi</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/sc:label">स्थिरीकरण केन्द्रबाट स्थान्तरण गर्नुहोस्</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/admission_type" data-name="/nutrition_screening/treatment/admission_type" value="defaulter" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">Returned defaulter</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">Devuelto por defecto</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">Défaillant retourné</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">डिफाल्टर लौट आया</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">Penggugat yang dikembalikan</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_type/defaulter:label">फिर्ता विफलता</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria:label">Admission criteria</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_criteria:label">Criterios de admisión</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_criteria:label">Critères d'admission</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_criteria:label">प्रवेश का मानदंड</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_criteria:label">Kriteria penerimaan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/admission_criteria:label">प्रवेश मापदण्ड</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="oedema_1_2" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">+ or ++ oedema</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">edema + o ++</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">œdème + ou ++</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">+ या ++ एडिमा</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">+ atau ++ edema</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">+ वा ++ edema</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="oedema_3" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">+++ oedema</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">edema +++</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">œdème +++</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">+++ edema</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">+++ edema</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">+++ edema</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="muac_115" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt; 11.5 cm</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt; 11.5 cm</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt; 11.5 cm</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt;11.5 सेमी</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt; 11.5 cm</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115:label">MUAC &lt;11.5 सेमी</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="muac_115_complications" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt; 11.5 cm with complications</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt;11.5 cm con complicaciones.</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt;11,5 cm avec complications</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt;11.5 सेमी जटिलताओं के साथ</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt;11,5 cm dengan komplikasi</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">MUAC &lt;11.5 सेमी जटिलता संग</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="muac_115_124" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">MUAC of 11.5 cm to 12.4 cm</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">MUAC de 11.5 cm a 12.4 cm</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">MUAC de 11,5 cm à 12,4 cm</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">11.5 सेमी से 12.4 सेमी का MUAC</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">MUAC dari 11,5 cm hingga 12,4 cm</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">11.5 सेन्टिमिटरसम्म 12.4 सेन्टीमिटरको MUAC</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="wfh_-3" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">Weight for height z-score &lt; -3</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">Peso para la altura puntuación z &lt;-3</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">Poids pour la taille z-score &lt;-3</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">ऊंचाई z- स्कोर के लिए वजन &lt;-3</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">Berat untuk tinggi z-skor &lt;-3</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">उचाई Z-score को लागी वजन &lt;-3</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="wfh_-3_complications" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">Weight for height z-score &lt; -3 with complications</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">Peso para la talla z-score &lt;-3 con complicaciones</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">Poids pour la taille z-score &lt;-3 avec complications</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">जटिलताओं के साथ ऊंचाई जेड-स्कोर &lt;-3 के लिए वजन</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">Berat untuk tinggi z-skor &lt;-3 dengan komplikasi</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">उचाइ Z-score को लागि वजन &lt;-3 जटिलहरु संग</span></label><label class=""><input type="checkbox" name="/nutrition_screening/treatment/admission_criteria" value="wfh_-3_-2" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">Weight for height z-score ≥ -3 to &lt; -2</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">Peso para la altura puntuación z ≥ -3 a &lt;-2</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">Poids pour la taille Score z ≥ -3 à &lt;-2</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">ऊंचाई z- स्कोर to -3 से &lt;-2 के लिए वजन</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">Berat untuk tinggi z-skor ≥ -3 hingga &lt;-2</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">उचाइ Z-स्कोर ≥ -3 को लागि वजन &lt;-2 सम्म</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/program:label">Admission treatment program</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/program:label">Programa de tratamiento de admisión.</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/program:label">Programme de traitement d'admission</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/program:label">प्रवेश उपचार कार्यक्रम</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/program:label">Program perawatan masuk</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/program:label">प्रवेश उपचार कार्यक्रम</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/treatment/program" data-name="/nutrition_screening/treatment/program" value="OTP" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/program/OTP:label">Outpatient Therapeutic Program (OTP)</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/program/OTP:label">Programa terapéutico ambulatorio (OTP)</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/program/OTP:label">Programme thérapeutique ambulatoire (ANP)</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/program/OTP:label">आउट पेशेंट चिकित्सीय कार्यक्रम (OTP)</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/program/OTP:label">Program Terapi Rawat Jalan (OTP)</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/program/OTP:label">आउटपेंटेन्ट चिकित्सीय कार्यक्रम (ओटीपी)</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/program" data-name="/nutrition_screening/treatment/program" value="SFP" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/program/SFP:label">Supplementary Feeding Program (SFP)</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SFP:label">Programa de Alimentación Suplementaria (SFP)</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SFP:label">Programme d'alimentation supplémentaire (SFP)</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SFP:label">अनुपूरक भक्षण कार्यक्रम (SFP)</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SFP:label">Program Pemberian Makanan Tambahan (SFP)</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SFP:label">पूरक फिडिंग कार्यक्रम (एस एफ पी)</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/program" data-name="/nutrition_screening/treatment/program" value="SC" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/program/SC:label">Stabilization Center (SC)</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SC:label">Centro de Estabilización (SC)</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SC:label">Centre de stabilisation (SC)</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SC:label">स्थिरीकरण केंद्र (SC)</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SC:label">Pusat Stabilisasi (SC)</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/program/SC:label">स्थिरीकरण केन्द्र (एससी)</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_otp:label">OTP admission criteria should be '+ or ++Oedema' or 'MUAC &lt; 11.5cm' or 'Weight for Height Z score &lt;-3'</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_otp:label">Los criterios de admisión de la PTO deben ser '+ o ++ Edema' o 'MUAC &lt;11.5cm' o 'Peso para la talla Z de puntuación &lt;-3'</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_otp:label">Les critères d'admission d'OTP doivent être 'œdème + ou ++' ou 'MUAC &lt;11,5 cm' ou 'Poids pour la taille Z score &lt;-3'.</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_otp:label">OTP प्रवेश मानदंड '+ या ++ एडिमा' या 'MUAC &lt;11.5cm' या 'ऊँचाई Z स्कोर के लिए भार &lt;-3' होना चाहिए</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_otp:label">Kriteria penerimaan OTP harus '+ atau ++ Edema' atau 'MUAC &lt;11.5cm' atau 'Skor Berat untuk Tinggi Z &lt;-3'</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_otp:label">OTP प्रवेश मापदण्ड '+ वा ++ एडमामा' वा 'MUAC &lt;11.5 सेमी' वा 'वजनको उचाइ Z स्कोर &lt;-3' हुनुपर्छ।</span><input type="text" name="/nutrition_screening/treatment/n_otp" data-relevant=" /nutrition_screening/treatment/program  = 'OTP'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_sfp:label">SFP admission criteria should be 'MUAC between 11.5 to 12.4cm' or 'Weight for Height Z score ≥ -3 to &lt; -2'</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sfp:label">Los criterios de admisión de SFP deben ser 'MUAC entre 11.5 a 12.4cm' o 'Peso para la talla Z de la escala ≥ -3 a &lt;-2'</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sfp:label">Les critères d'admission au SFP doivent être les suivants: "MUAC entre 11,5 et 12,4 cm" ou "Poids pour la taille Z score ≥ -3 à &lt;-2".</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sfp:label">SFP प्रवेश मानदंड '11.5 से 12.4cm के बीच MUAC' या 'ऊँचाई Z स्कोर के लिए भार' -3 से &lt;-2 'होना चाहिए</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sfp:label">Kriteria penerimaan SFP harus 'MUAC antara 11,5 hingga 12,4 cm' atau 'skor Berat untuk Tinggi Z ≥ -3 hingga &lt;-2'</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sfp:label">एसएफपी प्रवेश मापदंड 'MUAC को बीच 11.5 देखि 12.4 सेमी' या 'वजन को ऊँचाई Z स्कोर ≥ -3 देखि &lt;-2' सम्म हुनु पर्छ।</span><input type="text" name="/nutrition_screening/treatment/n_sfp" data-relevant=" /nutrition_screening/treatment/program  = 'SFP'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/n_sc:label">SC admission criteria should be '+++ Oedema' or 'MUAC &lt; 11.5cm with complications' or 'Weight for Height Z score &lt;-3 with complications'</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sc:label">Los criterios de admisión SC deben ser '+++ Edema' o 'MUAC &lt;11.5cm con complicaciones' o 'Peso para la talla Z puntuación &lt;-3 con complicaciones'</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sc:label">Les critères d'admission SC doivent être '+++ Œdème' ou 'MUAC &lt;11,5 cm avec complications' ou 'Poids pour la taille Z score &lt;-3 avec complications'</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sc:label">SC प्रवेश मानदंड '+++ एडिमा' या 'MUAC &lt;11.5 सेमी जटिलताओं के साथ' या 'वजन के लिए वजन Z स्कोर &lt;-3 जटिलताओं के साथ' होना चाहिए।</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sc:label">Kriteria penerimaan SC harus '+++ Edema' atau 'MUAC &lt;11.5cm dengan komplikasi' atau 'Skor Z untuk ketinggian Z &lt;-3 dengan komplikasi</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/n_sc:label">एससी प्रवेश मापदण्ड जटिलता संग '+++ एडमामा' वा 'MUAC &lt;11.5 सेमी हुनु पर्छ' वा 'ऊँचाई Z को लागि वजन स्कोर &lt;-3 जटिलता संग'</span><input type="text" name="/nutrition_screening/treatment/n_sc" data-relevant=" /nutrition_screening/treatment/program  = 'SC'" data-type-xml="string" readonly></label><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/facility:label">Facility of admission</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/facility:label">Facilidad de admisión.</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/facility:label">Facilité d'admission</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/facility:label">प्रवेश की सुविधा</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/facility:label">Fasilitas penerimaan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/facility:label">प्रवेश सुविधा</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/nutrition_screening/treatment/facility" data-name="/nutrition_screening/treatment/facility" value="clinic" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/facility/clinic:label">At your clinic</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/clinic:label">En tu clinica</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/clinic:label">À votre clinique</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/clinic:label">अपने क्लीनिक पर</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/clinic:label">Di klinik Anda</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/clinic:label">तपाईंको क्लिनिकमा</span></label><label class=""><input type="radio" name="/nutrition_screening/treatment/facility" data-name="/nutrition_screening/treatment/facility" value="other_clinic" data-required="true()" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">Referral to another clinic</span><span lang="es" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">Referencia a otra clínica</span><span lang="fr" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">Renvoi à une autre clinique</span><span lang="hi" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">दूसरे क्लिनिक में रैफर किया गया</span><span lang="id" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">Rujukan ke klinik lain</span><span lang="ne" class="option-label " data-itext-id="/nutrition_screening/treatment/facility/other_clinic:label">अर्को क्लिनिकलाई सन्दर्भ गर्नुहोस्</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/target_weight:label">Target Weight (kg)</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/target_weight:label">Peso objetivo (kg)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/target_weight:label">Poids cible (kg)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/target_weight:label">लक्ष्य वजन (किलो)</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/target_weight:label">Berat Target (kg)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/target_weight:label">लक्षित वजन (किलोग्राम)</span><input type="number" name="/nutrition_screening/treatment/target_weight" data-constraint=". &gt;= 0.8 and . &lt;= 68.5" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">Weight should be between 0.8 kg and 68.5 kg</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">-</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/target_muac:label">Target MUAC (cm)</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/target_muac:label">MUAC objetivo (cm)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/target_muac:label">MUAC cible (cm)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/target_muac:label">लक्ष्य MUAC (सेमी)</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/target_muac:label">Target MUAC (cm)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/target_muac:label">लक्षित MUAC (सेमी)</span><input type="number" name="/nutrition_screening/treatment/target_muac" data-constraint=". &gt;= 5 and . &lt;= 30" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" data-type-xml="decimal" step="any"><span lang="en" class="or-constraint-msg active" data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">MUAC should be between 5 and 30 cm</span><span lang="es" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">-</span><span lang="fr" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">-</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/other_facility:label">Name of facility</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/other_facility:label">Nombre de la instalación</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/other_facility:label">Nom de l'établissement</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/other_facility:label">सुविधा का नाम</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/other_facility:label">Nama fasilitas</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/other_facility:label">सुविधाको नाम</span><span class="required">*</span><input type="text" name="/nutrition_screening/treatment/other_facility" data-required="true()" data-relevant=" /nutrition_screening/treatment/facility  = 'other_clinic'" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/treatment/additional_notes:label">Additional notes</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/treatment/additional_notes:label">Notas adicionales</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/treatment/additional_notes:label">Notes complémentaires</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/treatment/additional_notes:label">अतिरिक्त नोट्स</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/treatment/additional_notes:label">Catatan tambahan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/treatment/additional_notes:label">थप नोटहरू</span><input type="text" name="/nutrition_screening/treatment/additional_notes" data-type-xml="string"></label>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-summary " name="/nutrition_screening/summary"><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_1:label">Patient Details<i class="fa fa-user"></i></span><input type="text" name="/nutrition_screening/summary/n_1" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_2:label"><h4><span class="or-output" data-value=" /nutrition_screening/child_name "> </span></h4></span><input type="text" name="/nutrition_screening/summary/n_2" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_3:label">Date of birth: <span class="or-output" data-value=" /nutrition_screening/dob "> </span> (<span class="or-output" data-value=" /nutrition_screening/age_in_days "> </span> days old)</span><input type="text" name="/nutrition_screening/summary/n_3" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_4:label">Gender: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_4:label">Género: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_4:label">Le sexe: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_4:label">लिंग: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_4:label">Jenis kelamin: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_4:label">लिङ्ग: <span class="or-output" data-value=" /nutrition_screening/measurements/gender "> </span></span><input type="text" name="/nutrition_screening/summary/n_4" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_5:label">Measurements<i class="fa fa-stethoscope"></i></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_5:label">Mediciones<i class="fa fa-stethoscope"></i></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_5:label">Des mesures<i class="fa fa-stethoscope"></i></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_5:label">माप<i class="fa fa-stethoscope"></i></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_5:label">pengukuran<i class="fa fa-stethoscope"></i></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_5:label">माप<i class="fa fa-stethoscope"></i></span><input type="text" name="/nutrition_screening/summary/n_5" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_6:label">Weight: <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> kg</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_6:label">peso <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> kg</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_6:label">poids <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> kg</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_6:label">वजन <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> किलो</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_6:label">berat <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> kg</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_6:label">वजन <span class="or-output" data-value=" /nutrition_screening/measurements/weight "> </span> किलो</span><input type="text" name="/nutrition_screening/summary/n_6" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_7:label">Height: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> cm</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_7:label">Altura: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> cm</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_7:label">Hauteur: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> cm</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_7:label">ऊंचाई: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> सेमी</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_7:label">Tinggi: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> cm</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_7:label">ऊँचाई: <span class="or-output" data-value=" /nutrition_screening/measurements/height "> </span> सेमी</span><input type="text" name="/nutrition_screening/summary/n_7" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_8:label">MUAC: <span class="or-output" data-value=" /nutrition_screening/measurements/muac "> </span> cm</span><input type="text" name="/nutrition_screening/summary/n_8" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h2 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_9:label">Weight for age</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_9:label">peso por edad</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_9:label">poids pour l'âge</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_9:label">उम्र के लिए वजन</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_9:label">berat untuk usia</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_9:label">उमेरको लागि वजन</span><input type="text" name="/nutrition_screening/summary/n_9" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_10:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfa "> </span></span><input type="text" name="/nutrition_screening/summary/n_10" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_11:label">interpretation: &lt; -3SD [Severely Malnourished]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_11:label">interpretación: &lt;-3SD [desnutrida severa]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_11:label">interprétation: &lt;-3SD [gravement malnutri]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_11:label">व्याख्या: &lt;-3SD [गंभीर रूप से कुपोषित]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_11:label">interpretasi: &lt;-3SD [Malnutrisi Berat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_11:label">व्याख्या: &lt;-3 एसडी [अत्यधिक माक्र्सित]</span><input type="text" name="/nutrition_screening/summary/n_11" data-relevant=" /nutrition_screening/wfa  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_12:label">interpretation: -3SD to &lt; -2SD [Moderately Malnourished]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_12:label">interpretación: -3SD a &lt;-2SD [malnutridos moderados]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_12:label">interprétation: -3SD à &lt;-2SD [Modérément mal nourris]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_12:label">व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से कुपोषित]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_12:label">interpretasi: -3SD hingga &lt;-2SD [Kurang gizi]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_12:label">व्याख्या: -3 एसडी &lt;&lt;एसडीडी [मातृभाषी पोषण गर्ने]</span><input type="text" name="/nutrition_screening/summary/n_12" data-relevant=" /nutrition_screening/wfa  &lt; -2 and  /nutrition_screening/wfa  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_13:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_13:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_13:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_13:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_13:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_13:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/summary/n_13" data-relevant=" /nutrition_screening/wfa  &lt;= 2 and  /nutrition_screening/wfa  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_14:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_14:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_14:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_14:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_14:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_14:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_screening/summary/n_14" data-relevant=" /nutrition_screening/wfa  &gt; 2 and  /nutrition_screening/wfa  &lt;= 3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_15:label">interpretation: &gt;3SD [Obese]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_15:label">interpretación:&gt; 3SD [Obeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_15:label">interprétation:&gt; 3SD [Obèse]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_15:label">व्याख्या:&gt; 3SD [मोटापा]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_15:label">interpretasi:&gt; 3SD [Obese]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_15:label">व्याख्या:&gt; 3 एसडी [Obese]</span><input type="text" name="/nutrition_screening/summary/n_15" data-relevant=" /nutrition_screening/wfa  &gt; 3" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h2 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_16:label">Height for age</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_16:label">Altura para la edad</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_16:label">Taille pour l'âge</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_16:label">उम्र के लिए ऊँचाई</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_16:label">Tinggi untuk usia</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_16:label">उमेरको लागि ऊँचाई</span><input type="text" name="/nutrition_screening/summary/n_16" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_17:label">z-score: <span class="or-output" data-value=" /nutrition_screening/hfa "> </span></span><input type="text" name="/nutrition_screening/summary/n_17" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_18:label">interpretation: &lt; -3SD [Severely Stunted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_18:label">interpretación: &lt;-3SD [severamente atrofiado]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_18:label">interprétation: &lt;-3SD [sévèrement stunté]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_18:label">व्याख्या: &lt;-3SD [गंभीर रूप से टूटी हुई]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_18:label">interpretasi: &lt;-3SD [Sangat terhambat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_18:label">व्याख्या: &lt;-3 एसडी [गंभीर रूप देखि चुपके]</span><input type="text" name="/nutrition_screening/summary/n_18" data-relevant=" /nutrition_screening/hfa  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_19:label">interpretation: -3SD to &lt;-2SD [Moderately Stunted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_19:label">Interpretación: -3SD a &lt;-2SD [moderadamente atrofiado]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_19:label">interprétation: -3SD à &lt;-2SD [Modérément retardé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_19:label">व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से अटका]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_19:label">interpretasi: -3SD hingga &lt;-2SD [Cukup terhambat]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_19:label">व्याख्या: -3 एसडी &lt;-2 एसडी [मध्य स्टंट गरिएको]</span><input type="text" name="/nutrition_screening/summary/n_19" data-relevant=" /nutrition_screening/hfa  &lt; -2 and  /nutrition_screening/hfa  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_20:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_20:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_20:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_20:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_20:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_20:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/summary/n_20" data-relevant=" /nutrition_screening/hfa  &lt;= 2 and  /nutrition_screening/hfa  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_21:label">interpretation: &gt;2SD [High]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_21:label">interpretación:&gt; 2SD [Alta]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_21:label">interprétation:&gt; 2SD [Elevé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_21:label">व्याख्या:&gt; 2SD [उच्च]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_21:label">interpretasi:&gt; 2SD [Tinggi]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_21:label">व्याख्या:&gt; 2 एसडी [उच्च]</span><input type="text" name="/nutrition_screening/summary/n_21" data-relevant=" /nutrition_screening/hfa  &gt; 2" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h2 or-appearance-blue "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_22:label">Weight for height</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_22:label">Peso para la altura</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_22:label">Poids pour la taille</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_22:label">ऊंचाई के लिए वजन</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_22:label">Berat untuk tinggi</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_22:label">उचाईको लागि वजन</span><input type="text" name="/nutrition_screening/summary/n_22" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_23:label">z-score: <span class="or-output" data-value=" /nutrition_screening/wfh "> </span></span><input type="text" name="/nutrition_screening/summary/n_23" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_24:label">interpretation: &lt; -3SD [Severely Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_24:label">interpretación: &lt;-3SD [muy malgastada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_24:label">interprétation: &lt;-3SD [gravement gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_24:label">व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_24:label">interpretasi: &lt;-3SD [Sangat Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_24:label">व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</span><input type="text" name="/nutrition_screening/summary/n_24" data-relevant=" /nutrition_screening/wfh  &lt; -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_25:label">interpretation: -3SD to &lt;-2SD [Moderately Wasted]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_25:label">interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_25:label">interprétation: -3SD à &lt;-2SD [modérément gaspillé]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_25:label">व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_25:label">interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_25:label">व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</span><input type="text" name="/nutrition_screening/summary/n_25" data-relevant=" /nutrition_screening/wfh  &lt; -2 and  /nutrition_screening/wfh  &gt;= -3" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_26:label">interpretation: -2SD to 2SD [Normal]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_26:label">interpretación: -2SD a 2SD [Normal]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_26:label">interprétation: -2SD à 2SD [Normal]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_26:label">व्याख्या: -2SD से 2SD [सामान्य]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_26:label">interpretasi: -2SD hingga 2SD [Normal]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_26:label">व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</span><input type="text" name="/nutrition_screening/summary/n_26" data-relevant=" /nutrition_screening/wfh  &lt;= 2 and  /nutrition_screening/wfh  &gt;= -2" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_27:label">interpretation: &gt;2SD [Overweight]</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_27:label">interpretación:&gt; 2SD [Sobrepeso]</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_27:label">interprétation:&gt; 2SD [Embonpoint]</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_27:label">व्याख्या:&gt; 2SD [अधिक वजन]</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_27:label">interpretasi:&gt; 2SD [Kegemukan]</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_27:label">व्याख्या:&gt; 2 एसडी [अधिक वजन]</span><input type="text" name="/nutrition_screening/summary/n_27" data-relevant=" /nutrition_screening/wfh  &gt; 2" data-type-xml="string" readonly></label><label class="question non-select or-appearance-h1 or-appearance-yellow "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_28:label">Treatment enrollment</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_28:label">Inscripción en el tratamiento</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_28:label">Inscription au traitement</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_28:label">उपचार नामांकन</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_28:label">Pendaftaran pengobatan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_28:label">उपचार नामांकन</span><input type="text" name="/nutrition_screening/summary/n_28" data-type-xml="string" readonly></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_29:label">Enrolled into a treatment program: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_29:label">Inscrito en un programa de tratamiento: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_29:label">Inscrit à un programme de traitement: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_29:label">एक उपचार कार्यक्रम में प्रवेश किया: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_29:label">Terdaftar dalam program perawatan: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_29:label">एक उपचार कार्यक्रममा नामाकरण गरिएको: <span class="or-output" data-value=" /nutrition_screening/treatment/enroll "> </span></span><input type="text" name="/nutrition_screening/summary/n_29" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_30:label">Facility of admission: <span class="or-output" data-value=" /nutrition_screening/c_facility "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_30:label">Facilidad de admisión: <span class="or-output" data-value=" /nutrition_screening/treatment/facility "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_30:label">Facilité d'admission: <span class="or-output" data-value=" /nutrition_screening/treatment/facility "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_30:label">प्रवेश की सुविधा: <span class="or-output" data-value=" /nutrition_screening/treatment/facility "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_30:label">Fasilitas penerimaan: <span class="or-output" data-value=" /nutrition_screening/treatment/facility "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_30:label">प्रवेश सुविधा: <span class="or-output" data-value=" /nutrition_screening/treatment/facility "> </span></span><input type="text" name="/nutrition_screening/summary/n_30" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_31:label">Facility referral: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_31:label">Remisión de instalaciones: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_31:label">Centre de référence: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_31:label">सुविधा रेफरल: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_31:label">Referensi fasilitas: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_31:label">सुविधा सन्दर्भ: <span class="or-output" data-value=" /nutrition_screening/treatment/other_facility "> </span></span><input type="text" name="/nutrition_screening/summary/n_31" data-relevant=" /nutrition_screening/treatment/facility  = 'other_clinic'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_32:label">Program: <span class="or-output" data-value=" /nutrition_screening/c_program "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_32:label">programa: <span class="or-output" data-value=" /nutrition_screening/treatment/program "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_32:label">programme: <span class="or-output" data-value=" /nutrition_screening/treatment/program "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_32:label">कार्यक्रम: <span class="or-output" data-value=" /nutrition_screening/treatment/program "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_32:label">Program: <span class="or-output" data-value=" /nutrition_screening/treatment/program "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_32:label">कार्यक्रम: <span class="or-output" data-value=" /nutrition_screening/treatment/program "> </span></span><input type="text" name="/nutrition_screening/summary/n_32" data-relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_33:label">Target weight: <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> kg</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_33:label">Peso objetivo <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> kg</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_33:label">Poids cible <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> kg</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_33:label">लक्ष्य वजन <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> किलो</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_33:label">Berat Target <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> kg</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_33:label">लक्षित वजन <span class="or-output" data-value=" /nutrition_screening/treatment/target_weight "> </span> किलोग्राम</span><input type="text" name="/nutrition_screening/summary/n_33" data-relevant=" /nutrition_screening/treatment/target_weight  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_34:label">Target MUAC: <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> cm</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_34:label">MUAC objetivo <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> cm</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_34:label">MUAC cible <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> cm</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_34:label">लक्ष्य MUAC <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> सेमी</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_34:label">Target MUAC <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> cm</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_34:label">लक्षित MUAC <span class="or-output" data-value=" /nutrition_screening/treatment/target_muac "> </span> सेमी</span><input type="text" name="/nutrition_screening/summary/n_34" data-relevant=" /nutrition_screening/treatment/target_muac  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_36:label">Reason for non-enrollment: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_36:label">Razones para no inscribirse: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_36:label">Raisons de la non-inscription: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_36:label">नामांकन न करने के कारण: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_36:label">Alasan tidak mendaftar: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_36:label">गैर नामांकनको कारण: <span class="or-output" data-value=" /nutrition_screening/c_reason "> </span></span><input type="text" name="/nutrition_screening/summary/n_36" data-relevant=" /nutrition_screening/treatment/enroll  = 'no'" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_37:label">Additional notes:</span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_37:label">Notas adicionales</span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_37:label">Notes complémentaires</span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_37:label">अतिरिक्त नोट्स</span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_37:label">Catatan tambahan</span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_37:label">थप नोटहरू</span><input type="text" name="/nutrition_screening/summary/n_37" data-relevant=" /nutrition_screening/treatment/additional_notes  != ''" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><span lang="es" class="question-label " data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><span lang="fr" class="question-label " data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><span lang="hi" class="question-label " data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><span lang="id" class="question-label " data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><span lang="ne" class="question-label " data-itext-id="/nutrition_screening/summary/n_38:label"> <span class="or-output" data-value=" /nutrition_screening/treatment/additional_notes "> </span></span><input type="text" name="/nutrition_screening/summary/n_38" data-relevant=" /nutrition_screening/treatment/additional_notes  != ''" data-type-xml="string" readonly></label>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/nutrition_screening/patient_uuid" data-calculate="../inputs/contact/_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/patient_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/child_name" data-calculate="../inputs/contact/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/patient_id" data-calculate="../inputs/contact/patient_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/dob" data-calculate="substr(../inputs/contact/date_of_birth, 0, 10)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/age_in_days" data-calculate="int(decimal-date-time(today()) - decimal-date-time(date( /nutrition_screening/dob )))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/wfa" data-calculate="round(z-score('weight-for-age',  /nutrition_screening/measurements/gender ,  /nutrition_screening/age_in_days ,  /nutrition_screening/measurements/weight ), 1)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/hfa" data-calculate="round(z-score('height-for-age',  /nutrition_screening/measurements/gender ,  /nutrition_screening/age_in_days ,  /nutrition_screening/measurements/height ), 1)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/wfh" data-calculate="round(z-score('weight-for-height',  /nutrition_screening/measurements/gender ,  /nutrition_screening/measurements/height ,  /nutrition_screening/measurements/weight ), 1)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/c_reason" data-calculate="jr:choice-name( /nutrition_screening/treatment/reason , ' /nutrition_screening/treatment/reason ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/c_program" data-calculate="jr:choice-name( /nutrition_screening/treatment/program , ' /nutrition_screening/treatment/program ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/c_facility" data-calculate="jr:choice-name( /nutrition_screening/treatment/facility , ' /nutrition_screening/treatment/facility ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/nutrition_screening/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <nutrition_screening xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="nutrition_screening" prefix="J1!nutrition_screening!" version="2022-03-04 11-21">
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
          <child_name/>
          <patient_id/>
          <dob/>
          <age_in_days/>
          <wfa/>
          <hfa/>
          <wfh/>
          <c_reason/>
          <c_program/>
          <c_facility/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
          </measurements>
          <treatment>
            <n_zscore/>
            <n_wfa/>
            <n_wfa_s_malnourished/>
            <n_wfa_m_malnourished/>
            <n_wfa_normal/>
            <n_wfa_overweight/>
            <n_wfa_obese/>
            <n_hfa/>
            <n_hfa_s_stunted/>
            <n_hfa_m_stunted/>
            <n_hfa_stunted/>
            <n_hfa_high/>
            <n_wfh/>
            <n_wfh_s_wasted/>
            <n_wfh_m_wasted/>
            <n_wfh_normal/>
            <n_wfh_overwweight/>
            <enroll/>
            <reason/>
            <admission_type/>
            <admission_criteria/>
            <program/>
            <n_otp/>
            <n_sfp/>
            <n_sc/>
            <facility/>
            <target_weight/>
            <target_muac/>
            <other_facility/>
            <additional_notes/>
          </treatment>
          <summary>
            <n_1/>
            <n_2/>
            <n_3/>
            <n_4/>
            <n_5/>
            <n_6/>
            <n_7/>
            <n_8/>
            <n_9/>
            <n_10/>
            <n_11/>
            <n_12/>
            <n_13/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
            <n_18/>
            <n_19/>
            <n_20/>
            <n_21/>
            <n_22/>
            <n_23/>
            <n_24/>
            <n_25/>
            <n_26/>
            <n_27/>
            <n_28/>
            <n_29/>
            <n_30/>
            <n_31/>
            <n_32/>
            <n_33/>
            <n_34/>
            <n_36/>
            <n_37/>
            <n_38/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_screening>
      </instance>
    <instance id="contact-summary"/>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Nutrition screening</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>What is the patient's name?</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>Female</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>Male</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>Gender</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>Height should be between 45 cm and 120 cm</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>Height (cm)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>MUAC should be between 5 and 30 cm</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>MUAC Measurement</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>Weight should be between 0.8 kg and 68.5 kg</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>Weight (kg)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>Measurements</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>interpretation: &lt; -3SD [Severely Malnourished]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>interpretation: -3SD to &lt; -2SD [Moderately Malnourished]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>interpretation: &gt;3SD [Obese]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>Height for age</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>interpretation: &lt; -3SD [Severely Stunted]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Stunted]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>interpretation: &gt;2SD [High]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>Weight for height</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>interpretation: &lt; -3SD [Severely Wasted]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Wasted]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>Treatment enrollment</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>Enrolled into a treatment program: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>Facility of admission: <output value=" /nutrition_screening/c_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>Facility referral: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>Program: <output value=" /nutrition_screening/c_program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>Target weight: <output value=" /nutrition_screening/treatment/target_weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>Target MUAC: <output value=" /nutrition_screening/treatment/target_muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>Reason for non-enrollment: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>Additional notes:</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>Gender: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>Measurements&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>Weight: <output value=" /nutrition_screening/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>Height: <output value=" /nutrition_screening/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>Weight for age</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>Additional notes</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt; 11.5 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>MUAC of 11.5 cm to 12.4 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt; 11.5 cm with complications</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>+ or ++ oedema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>+++ oedema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>Weight for height z-score &lt; -3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>Weight for height z-score ≥ -3 to &lt; -2</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>Weight for height z-score &lt; -3 with complications</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>Admission criteria</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>Returned defaulter</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>New case</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>Transfer from Outpatient Therapeutic Programme</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>Relapse/Readmission</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>Transfer from Stabilization Center</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>Transfer from Supplementary Feeding Programme</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>Type of admission</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>Yes</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>Do you want to enroll into a treatment program?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>At your clinic</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>Referral to another clinic</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>Facility of admission</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>height for age: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>interpretation: &gt;2SD [High]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Stunted]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>interpretation: &lt; -3SD [Severely Stunted]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>OTP admission criteria should be '+ or ++Oedema' or 'MUAC &lt; 11.5cm' or 'Weight for Height Z score &lt;-3'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>SC admission criteria should be '+++ Oedema' or 'MUAC &lt; 11.5cm with complications' or 'Weight for Height Z score &lt;-3 with complications'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>SFP admission criteria should be 'MUAC between 11.5 to 12.4cm' or 'Weight for Height Z score ≥ -3 to &lt; -2'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>weight for age: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>interpretation: -3SD to &lt; -2SD [Moderately Malnourished]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>interpretation: &gt;3SD [Obese]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>interpretation: &lt; -3SD [Severely Malnourished]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>weight for height: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>interpretation: -3SD to &lt;-2SD [Moderately Wasted]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>interpretation: -2SD to 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>interpretation: &gt;2SD [Overweight]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>interpretation: &lt; -3SD [Severely Wasted]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>z-score measurements</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>Name of facility</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>Outpatient Therapeutic Program (OTP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>Stabilization Center (SC)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>Supplementary Feeding Program (SFP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>Admission treatment program</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>Chronic malnutrition</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>False positive</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>Nutrition status check</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>Reason for non-enrollment</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>MUAC should be between 5 and 30 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>Target MUAC (cm)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>Weight should be between 0.8 kg and 68.5 kg</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>Target Weight (kg)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>Interpretation</value>
          </text>
        </translation>
        <translation lang="es">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>Hembra</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>Masculino</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>Género</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>Altura (cm)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>Medida de muac</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>Peso (kg)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>Mediciones</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>interpretación: &lt;-3SD [desnutrida severa]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>interpretación: -3SD a &lt;-2SD [malnutridos moderados]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>interpretación:&gt; 3SD [Obeso]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>Altura para la edad</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>interpretación: &lt;-3SD [severamente atrofiado]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>Interpretación: -3SD a &lt;-2SD [moderadamente atrofiado]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>interpretación:&gt; 2SD [Alta]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>Peso para la altura</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>interpretación: &lt;-3SD [muy malgastada]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>Inscripción en el tratamiento</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>Inscrito en un programa de tratamiento: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>Facilidad de admisión: <output value=" /nutrition_screening/treatment/facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>Remisión de instalaciones: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>programa: <output value=" /nutrition_screening/treatment/program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>Peso objetivo <output value=" /nutrition_screening/treatment/target_weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>MUAC objetivo <output value=" /nutrition_screening/treatment/target_muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>Razones para no inscribirse: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>Notas adicionales</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>Género: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>Mediciones&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>peso <output value=" /nutrition_screening/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>Altura: <output value=" /nutrition_screening/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>peso por edad</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>Notas adicionales</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt; 11.5 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>MUAC de 11.5 cm a 12.4 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt;11.5 cm con complicaciones.</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>edema + o ++</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>edema +++</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>Peso para la altura puntuación z &lt;-3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>Peso para la altura puntuación z ≥ -3 a &lt;-2</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>Peso para la talla z-score &lt;-3 con complicaciones</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>Criterios de admisión</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>Devuelto por defecto</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>Nuevo caso</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>Transferencia del programa terapéutico ambulatorio</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>Recaída / Readmisión</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>Traslado desde el centro de estabilización</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>Transferencia del Programa de Alimentación Suplementaria</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>Tipo de ingreso</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>No</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>Sí</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>¿Quieres inscribirte en un programa de tratamiento?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>En tu clinica</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>Referencia a otra clínica</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>Facilidad de admisión.</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>Altura por edad: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>interpretación:&gt; 2SD [Alta]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>Interpretación: -3SD a &lt;-2SD [moderadamente atrofiado]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>interpretación: &lt;-3SD [severamente atrofiado]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>Los criterios de admisión de la PTO deben ser '+ o ++ Edema' o 'MUAC &lt;11.5cm' o 'Peso para la talla Z de puntuación &lt;-3'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>Los criterios de admisión SC deben ser '+++ Edema' o 'MUAC &lt;11.5cm con complicaciones' o 'Peso para la talla Z puntuación &lt;-3 con complicaciones'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>Los criterios de admisión de SFP deben ser 'MUAC entre 11.5 a 12.4cm' o 'Peso para la talla Z de la escala ≥ -3 a &lt;-2'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>peso por edad: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>interpretación: -3SD a &lt;-2SD [malnutridos moderados]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>interpretación:&gt; 3SD [Obeso]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>interpretación: &lt;-3SD [desnutrida severa]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>peso por altura: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>interpretación: -3SD a &lt;-2SD [moderadamente desperdiciada]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>interpretación: -2SD a 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>interpretación:&gt; 2SD [Sobrepeso]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>interpretación: &lt;-3SD [muy malgastada]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>mediciones de puntuación z</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>Nombre de la instalación</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>Programa terapéutico ambulatorio (OTP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>Centro de Estabilización (SC)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>Programa de Alimentación Suplementaria (SFP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>Programa de tratamiento de admisión.</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>Desnutricion cronica</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>Falso positivo</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>Verificación del estado nutricional</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>Razones para no inscribirse</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>MUAC objetivo (cm)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>Peso objetivo (kg)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>Interpretación</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>Quel est l'identifiant du patient?</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>Patient</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>Femelle</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>Mâle</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>Le sexe</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>Hauteur (cm)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>Mesure MUAC</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>poids (kg)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>Des mesures</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>interprétation: &lt;-3SD [gravement malnutri]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>interprétation: -3SD à &lt;-2SD [Modérément mal nourris]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>interprétation:&gt; 3SD [Obèse]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>Taille pour l'âge</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>interprétation: &lt;-3SD [sévèrement stunté]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>interprétation: -3SD à &lt;-2SD [Modérément retardé]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>interprétation:&gt; 2SD [Elevé]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>Poids pour la taille</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>interprétation: &lt;-3SD [gravement gaspillé]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>interprétation: -3SD à &lt;-2SD [modérément gaspillé]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>Inscription au traitement</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>Inscrit à un programme de traitement: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>Facilité d'admission: <output value=" /nutrition_screening/treatment/facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>Centre de référence: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>programme: <output value=" /nutrition_screening/treatment/program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>Poids cible <output value=" /nutrition_screening/treatment/target_weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>MUAC cible <output value=" /nutrition_screening/treatment/target_muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>Raisons de la non-inscription: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>Notes complémentaires</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>Le sexe: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>Des mesures&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>poids <output value=" /nutrition_screening/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>Hauteur: <output value=" /nutrition_screening/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>poids pour l'âge</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>Notes complémentaires</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt; 11.5 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>MUAC de 11,5 cm à 12,4 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt;11,5 cm avec complications</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>œdème + ou ++</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>œdème +++</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>Poids pour la taille z-score &lt;-3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>Poids pour la taille Score z ≥ -3 à &lt;-2</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>Poids pour la taille z-score &lt;-3 avec complications</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>Critères d'admission</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>Défaillant retourné</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>Nouveau cas</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>Transfert du programme thérapeutique ambulatoire</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>Rechute / Réadmission</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>Transfert du centre de stabilisation</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>Transfert du programme d'alimentation supplémentaire</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>Type d'admission</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>Non</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>Oui</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>Voulez-vous vous inscrire à un programme de traitement?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>À votre clinique</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>Renvoi à une autre clinique</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>Facilité d'admission</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>taille pour l'âge: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>interprétation:&gt; 2SD [Elevé]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>interprétation: -3SD à &lt;-2SD [Modérément retardé]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>interprétation: &lt;-3SD [sévèrement stunté]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>Les critères d'admission d'OTP doivent être 'œdème + ou ++' ou 'MUAC &lt;11,5 cm' ou 'Poids pour la taille Z score &lt;-3'.</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>Les critères d'admission SC doivent être '+++ Œdème' ou 'MUAC &lt;11,5 cm avec complications' ou 'Poids pour la taille Z score &lt;-3 avec complications'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>Les critères d'admission au SFP doivent être les suivants: "MUAC entre 11,5 et 12,4 cm" ou "Poids pour la taille Z score ≥ -3 à &lt;-2".</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>poids pour l'âge: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>interprétation: -3SD à &lt;-2SD [Modérément mal nourris]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>interprétation:&gt; 3SD [Obèse]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>interprétation: &lt;-3SD [gravement malnutri]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>poids pour taille: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>interprétation: -3SD à &lt;-2SD [modérément gaspillé]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>interprétation: -2SD à 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>interprétation:&gt; 2SD [Embonpoint]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>interprétation: &lt;-3SD [gravement gaspillé]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>mesures z-score</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>Nom de l'établissement</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>Programme thérapeutique ambulatoire (ANP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>Centre de stabilisation (SC)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>Programme d'alimentation supplémentaire (SFP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>Programme de traitement d'admission</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>Malnutrition chronique</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>Faux positif</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>Vérification de l'état nutritionnel</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>Raisons de la non-inscription</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>MUAC cible (cm)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>Poids cible (kg)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>Interprétation</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>मरीज का नाम क्या है?</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>मरीज</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>पुरुष</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>लिंग</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>ऊंचाई (सेंटिमीटर)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>माप</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से कुपोषित]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से कुपोषित]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>व्याख्या:&gt; 3SD [मोटापा]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>उम्र के लिए ऊँचाई</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से टूटी हुई]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से अटका]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>व्याख्या:&gt; 2SD [उच्च]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>ऊंचाई के लिए वजन</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>उपचार नामांकन</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>एक उपचार कार्यक्रम में प्रवेश किया: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>प्रवेश की सुविधा: <output value=" /nutrition_screening/treatment/facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>सुविधा रेफरल: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>कार्यक्रम: <output value=" /nutrition_screening/treatment/program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>लक्ष्य वजन <output value=" /nutrition_screening/treatment/target_weight "/> किलो</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>लक्ष्य MUAC <output value=" /nutrition_screening/treatment/target_muac "/> सेमी</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>नामांकन न करने के कारण: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>अतिरिक्त नोट्स</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>लिंग: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>माप&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>वजन <output value=" /nutrition_screening/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>ऊंचाई: <output value=" /nutrition_screening/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>उम्र के लिए वजन</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>अतिरिक्त नोट्स</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt;11.5 सेमी</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>11.5 सेमी से 12.4 सेमी का MUAC</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt;11.5 सेमी जटिलताओं के साथ</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>+ या ++ एडिमा</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>+++ edema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>ऊंचाई z- स्कोर के लिए वजन &lt;-3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>ऊंचाई z- स्कोर to -3 से &lt;-2 के लिए वजन</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>जटिलताओं के साथ ऊंचाई जेड-स्कोर &lt;-3 के लिए वजन</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>प्रवेश का मानदंड</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>डिफाल्टर लौट आया</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>नया केस</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>आउट पेशेंट चिकित्सीय कार्यक्रम से स्थानांतरण</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>पलटा / पुनः भर्ती</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>स्थिरीकरण केंद्र से स्थानांतरण</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>अनुपूरक फीडिंग कार्यक्रम से स्थानांतरण</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>प्रवेश का प्रकार</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>नहीं</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>हाँ</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>क्या आप एक उपचार कार्यक्रम में दाखिला लेना चाहते हैं?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>अपने क्लीनिक पर</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>दूसरे क्लिनिक में रैफर किया गया</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>प्रवेश की सुविधा</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>उम्र के लिए ऊंचाई: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>व्याख्या:&gt; 2SD [उच्च]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से अटका]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से टूटी हुई]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>OTP प्रवेश मानदंड '+ या ++ एडिमा' या 'MUAC &lt;11.5cm' या 'ऊँचाई Z स्कोर के लिए भार &lt;-3' होना चाहिए</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>SC प्रवेश मानदंड '+++ एडिमा' या 'MUAC &lt;11.5 सेमी जटिलताओं के साथ' या 'वजन के लिए वजन Z स्कोर &lt;-3 जटिलताओं के साथ' होना चाहिए।</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>SFP प्रवेश मानदंड '11.5 से 12.4cm के बीच MUAC' या 'ऊँचाई Z स्कोर के लिए भार' -3 से &lt;-2 'होना चाहिए</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>उम्र के लिए वजन: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>व्याख्या: -3SD से &lt;-2SD [मध्यम रूप से कुपोषित]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>व्याख्या:&gt; 3SD [मोटापा]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से कुपोषित]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>वजन ऊंचाई के लिए: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>व्याख्या: करने के लिए -3SD &lt;-2SD [मामूली व्यर्थ]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>व्याख्या: -2SD से 2SD [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>व्याख्या:&gt; 2SD [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>व्याख्या: &lt;-3SD [गंभीर रूप से बर्बाद]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>z- स्कोर माप</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>सुविधा का नाम</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>आउट पेशेंट चिकित्सीय कार्यक्रम (OTP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>स्थिरीकरण केंद्र (SC)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>अनुपूरक भक्षण कार्यक्रम (SFP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>प्रवेश उपचार कार्यक्रम</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>जीर्ण कुपोषण</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>सकारात्मक झूठी</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>पोषण की स्थिति की जाँच</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>नामांकन न करने के कारण</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>लक्ष्य MUAC (सेमी)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>लक्ष्य वजन (किलो)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>व्याख्या</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>Apa nama pasien?</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>Pasien</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>Wanita</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>Pria</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>Jenis kelamin</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>Tinggi (cm)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>Pengukuran MUAC</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>Berat (kg)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>Pengukuran</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>interpretasi: &lt;-3SD [Malnutrisi Berat]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Kurang gizi]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>interpretasi:&gt; 3SD [Obese]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>Tinggi untuk usia</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>interpretasi: &lt;-3SD [Sangat terhambat]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Cukup terhambat]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>interpretasi:&gt; 2SD [Tinggi]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>Berat untuk tinggi</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>interpretasi: &lt;-3SD [Sangat Terbuang]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>Pendaftaran pengobatan</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>Terdaftar dalam program perawatan: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>Fasilitas penerimaan: <output value=" /nutrition_screening/treatment/facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>Referensi fasilitas: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>Program: <output value=" /nutrition_screening/treatment/program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>Berat Target <output value=" /nutrition_screening/treatment/target_weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>Target MUAC <output value=" /nutrition_screening/treatment/target_muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>Alasan tidak mendaftar: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>Catatan tambahan</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>Jenis kelamin: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>pengukuran&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>berat <output value=" /nutrition_screening/measurements/weight "/> kg</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>Tinggi: <output value=" /nutrition_screening/measurements/height "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>berat untuk usia</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>Catatan tambahan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt; 11.5 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>MUAC dari 11,5 cm hingga 12,4 cm</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt;11,5 cm dengan komplikasi</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>+ atau ++ edema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>+++ edema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>Berat untuk tinggi z-skor &lt;-3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>Berat untuk tinggi z-skor ≥ -3 hingga &lt;-2</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>Berat untuk tinggi z-skor &lt;-3 dengan komplikasi</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>Kriteria penerimaan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>Penggugat yang dikembalikan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>Kasus baru</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>Transfer dari Program Terapi Rawat Jalan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>Relaps / Penerimaan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>Transfer dari Pusat Stabilisasi</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>Transfer dari Program Pemberian Makanan Tambahan</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>Jenis penerimaan</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>Tidak</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>iya nih</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>Apakah Anda ingin mendaftar ke program perawatan?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>Di klinik Anda</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>Rujukan ke klinik lain</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>Fasilitas penerimaan</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>tinggi untuk usia: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>interpretasi:&gt; 2SD [Tinggi]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Cukup terhambat]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>interpretasi: &lt;-3SD [Sangat terhambat]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>Kriteria penerimaan OTP harus '+ atau ++ Edema' atau 'MUAC &lt;11.5cm' atau 'Skor Berat untuk Tinggi Z &lt;-3'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>Kriteria penerimaan SC harus '+++ Edema' atau 'MUAC &lt;11.5cm dengan komplikasi' atau 'Skor Z untuk ketinggian Z &lt;-3 dengan komplikasi</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>Kriteria penerimaan SFP harus 'MUAC antara 11,5 hingga 12,4 cm' atau 'skor Berat untuk Tinggi Z ≥ -3 hingga &lt;-2'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>berat untuk usia: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Kurang gizi]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>interpretasi:&gt; 3SD [Obese]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>interpretasi: &lt;-3SD [Malnutrisi Berat]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>berat untuk tinggi: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>interpretasi: -3SD hingga &lt;-2SD [Sedang Terbuang]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>interpretasi: -2SD hingga 2SD [Normal]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>interpretasi:&gt; 2SD [Kegemukan]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>interpretasi: &lt;-3SD [Sangat Terbuang]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>pengukuran z-skor</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>Nama fasilitas</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>Program Terapi Rawat Jalan (OTP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>Pusat Stabilisasi (SC)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>Program Pemberian Makanan Tambahan (SFP)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>Program perawatan masuk</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>Malnutrisi kronis</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>Salah positif</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>Pemeriksaan status gizi</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>Alasan tidak mendaftar</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>Target MUAC (cm)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>Berat Target (kg)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>Interpretasi</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/nutrition_screening/inputs/contact/_id:label">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/inputs:label">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/female:label">
            <value>महिला</value>
          </text>
          <text id="/nutrition_screening/measurements/gender/male:label">
            <value>नर</value>
          </text>
          <text id="/nutrition_screening/measurements/gender:label">
            <value>लिङ्ग</value>
          </text>
          <text id="/nutrition_screening/measurements/height:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/height:label">
            <value>ऊँचाई (सेमी)</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/muac:label">
            <value>MUAC माप</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/measurements/weight:label">
            <value>वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_screening/measurements:label">
            <value>माप</value>
          </text>
          <text id="/nutrition_screening/summary/n_10:label">
            <value>z-score: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_11:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक माक्र्सित]</value>
          </text>
          <text id="/nutrition_screening/summary/n_12:label">
            <value>व्याख्या: -3 एसडी &lt;&lt;एसडीडी [मातृभाषी पोषण गर्ने]</value>
          </text>
          <text id="/nutrition_screening/summary/n_13:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_14:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/summary/n_15:label">
            <value>व्याख्या:&gt; 3 एसडी [Obese]</value>
          </text>
          <text id="/nutrition_screening/summary/n_16:label">
            <value>उमेरको लागि ऊँचाई</value>
          </text>
          <text id="/nutrition_screening/summary/n_17:label">
            <value>z-score: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_18:label">
            <value>व्याख्या: &lt;-3 एसडी [गंभीर रूप देखि चुपके]</value>
          </text>
          <text id="/nutrition_screening/summary/n_19:label">
            <value>व्याख्या: -3 एसडी &lt;-2 एसडी [मध्य स्टंट गरिएको]</value>
          </text>
          <text id="/nutrition_screening/summary/n_1:label">
            <value>Patient Details&lt;i class="fa fa-user"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_20:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_21:label">
            <value>व्याख्या:&gt; 2 एसडी [उच्च]</value>
          </text>
          <text id="/nutrition_screening/summary/n_22:label">
            <value>उचाईको लागि वजन</value>
          </text>
          <text id="/nutrition_screening/summary/n_23:label">
            <value>z-score: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_24:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_screening/summary/n_25:label">
            <value>व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_screening/summary/n_26:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/summary/n_27:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/summary/n_28:label">
            <value>उपचार नामांकन</value>
          </text>
          <text id="/nutrition_screening/summary/n_29:label">
            <value>एक उपचार कार्यक्रममा नामाकरण गरिएको: <output value=" /nutrition_screening/treatment/enroll "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_2:label">
            <value>&lt;h4&gt;<output value=" /nutrition_screening/child_name "/>&lt;/h4&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_30:label">
            <value>प्रवेश सुविधा: <output value=" /nutrition_screening/treatment/facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_31:label">
            <value>सुविधा सन्दर्भ: <output value=" /nutrition_screening/treatment/other_facility "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_32:label">
            <value>कार्यक्रम: <output value=" /nutrition_screening/treatment/program "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_33:label">
            <value>लक्षित वजन <output value=" /nutrition_screening/treatment/target_weight "/> किलोग्राम</value>
          </text>
          <text id="/nutrition_screening/summary/n_34:label">
            <value>लक्षित MUAC <output value=" /nutrition_screening/treatment/target_muac "/> सेमी</value>
          </text>
          <text id="/nutrition_screening/summary/n_36:label">
            <value>गैर नामांकनको कारण: <output value=" /nutrition_screening/c_reason "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_37:label">
            <value>थप नोटहरू</value>
          </text>
          <text id="/nutrition_screening/summary/n_38:label">
            <value><output value=" /nutrition_screening/treatment/additional_notes "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_3:label">
            <value>Date of birth: <output value=" /nutrition_screening/dob "/> (<output value=" /nutrition_screening/age_in_days "/> days old)</value>
          </text>
          <text id="/nutrition_screening/summary/n_4:label">
            <value>लिङ्ग: <output value=" /nutrition_screening/measurements/gender "/></value>
          </text>
          <text id="/nutrition_screening/summary/n_5:label">
            <value>माप&lt;i class="fa fa-stethoscope"&gt;&lt;/i&gt;</value>
          </text>
          <text id="/nutrition_screening/summary/n_6:label">
            <value>वजन <output value=" /nutrition_screening/measurements/weight "/> किलो</value>
          </text>
          <text id="/nutrition_screening/summary/n_7:label">
            <value>ऊँचाई: <output value=" /nutrition_screening/measurements/height "/> सेमी</value>
          </text>
          <text id="/nutrition_screening/summary/n_8:label">
            <value>MUAC: <output value=" /nutrition_screening/measurements/muac "/> cm</value>
          </text>
          <text id="/nutrition_screening/summary/n_9:label">
            <value>उमेरको लागि वजन</value>
          </text>
          <text id="/nutrition_screening/treatment/additional_notes:label">
            <value>थप नोटहरू</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115:label">
            <value>MUAC &lt;11.5 सेमी</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_124:label">
            <value>11.5 सेन्टिमिटरसम्म 12.4 सेन्टीमिटरको MUAC</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/muac_115_complications:label">
            <value>MUAC &lt;11.5 सेमी जटिलता संग</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_1_2:label">
            <value>+ वा ++ edema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/oedema_3:label">
            <value>+++ edema</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3:label">
            <value>उचाई Z-score को लागी वजन &lt;-3</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label">
            <value>उचाइ Z-स्कोर ≥ -3 को लागि वजन &lt;-2 सम्म</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label">
            <value>उचाइ Z-score को लागि वजन &lt;-3 जटिलहरु संग</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_criteria:label">
            <value>प्रवेश मापदण्ड</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/defaulter:label">
            <value>फिर्ता विफलता</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/new_case:label">
            <value>नयाँ मामला</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/otp:label">
            <value>आउटपेटेंट चिकित्सीय कार्यक्रमबाट स्थान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/relapse:label">
            <value>छुट / दर्ता</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sc:label">
            <value>स्थिरीकरण केन्द्रबाट स्थान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type/sfp:label">
            <value>पूरक फिडिंग कार्यक्रमबाट स्थान्तरण गर्नुहोस्</value>
          </text>
          <text id="/nutrition_screening/treatment/admission_type:label">
            <value>प्रवेशको प्रकार</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/no:label">
            <value>होइन</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll/yes:label">
            <value>हो</value>
          </text>
          <text id="/nutrition_screening/treatment/enroll:label">
            <value>के तपाइँ एक उपचार कार्यक्रममा नामाकरण गर्न चाहनुहुन्छ?</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/clinic:label">
            <value>तपाईंको क्लिनिकमा</value>
          </text>
          <text id="/nutrition_screening/treatment/facility/other_clinic:label">
            <value>अर्को क्लिनिकलाई सन्दर्भ गर्नुहोस्</value>
          </text>
          <text id="/nutrition_screening/treatment/facility:label">
            <value>प्रवेश सुविधा</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa:label">
            <value>उमेरको लागि उचाई: <output value=" /nutrition_screening/hfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_high:label">
            <value>व्याख्या:&gt; 2 एसडी [उच्च]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_m_stunted:label">
            <value>व्याख्या: -3 एसडी &lt;-2 एसडी [मध्य स्टंट गरिएको]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_s_stunted:label">
            <value>व्याख्या: &lt;-3 एसडी [गंभीर रूप देखि चुपके]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_hfa_stunted:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_otp:label">
            <value>OTP प्रवेश मापदण्ड '+ वा ++ एडमामा' वा 'MUAC &lt;11.5 सेमी' वा 'वजनको उचाइ Z स्कोर &lt;-3' हुनुपर्छ।</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sc:label">
            <value>एससी प्रवेश मापदण्ड जटिलता संग '+++ एडमामा' वा 'MUAC &lt;11.5 सेमी हुनु पर्छ' वा 'ऊँचाई Z को लागि वजन स्कोर &lt;-3 जटिलता संग'</value>
          </text>
          <text id="/nutrition_screening/treatment/n_sfp:label">
            <value>एसएफपी प्रवेश मापदंड 'MUAC को बीच 11.5 देखि 12.4 सेमी' या 'वजन को ऊँचाई Z स्कोर ≥ -3 देखि &lt;-2' सम्म हुनु पर्छ।</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa:label">
            <value>वजनको लागि उमेर: <output value=" /nutrition_screening/wfa "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_m_malnourished:label">
            <value>व्याख्या: -3 एसडी &lt;&lt;एसडीडी [मातृभाषी पोषण गर्ने]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_normal:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_obese:label">
            <value>व्याख्या:&gt; 3 एसडी [Obese]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_overweight:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfa_s_malnourished:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक माक्र्सित]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh:label">
            <value>वजनको लागि वजन: <output value=" /nutrition_screening/wfh "/></value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_m_wasted:label">
            <value>व्याख्या: -3 एसडी देखि &lt;-2 एसडी [सामान्य बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_normal:label">
            <value>व्याख्या: -2 एसडी देखि 2 एसडी [सामान्य]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_overwweight:label">
            <value>व्याख्या:&gt; 2 एसडी [अधिक वजन]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_wfh_s_wasted:label">
            <value>व्याख्या: &lt;-3 एसडी [अत्यधिक बर्बाद भयो]</value>
          </text>
          <text id="/nutrition_screening/treatment/n_zscore:label">
            <value>z-score माप</value>
          </text>
          <text id="/nutrition_screening/treatment/other_facility:label">
            <value>सुविधाको नाम</value>
          </text>
          <text id="/nutrition_screening/treatment/program/OTP:label">
            <value>आउटपेंटेन्ट चिकित्सीय कार्यक्रम (ओटीपी)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SC:label">
            <value>स्थिरीकरण केन्द्र (एससी)</value>
          </text>
          <text id="/nutrition_screening/treatment/program/SFP:label">
            <value>पूरक फिडिंग कार्यक्रम (एस एफ पी)</value>
          </text>
          <text id="/nutrition_screening/treatment/program:label">
            <value>प्रवेश उपचार कार्यक्रम</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/chronic_malnutrition:label">
            <value>पुरानो कुपोषण</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/false_positive:label">
            <value>झूटा सकारात्मक</value>
          </text>
          <text id="/nutrition_screening/treatment/reason/status_check:label">
            <value>पोषण स्थिति जाँच</value>
          </text>
          <text id="/nutrition_screening/treatment/reason:label">
            <value>गैर नामांकनको कारण</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_muac:label">
            <value>लक्षित MUAC (सेमी)</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/nutrition_screening/treatment/target_weight:label">
            <value>लक्षित वजन (किलोग्राम)</value>
          </text>
          <text id="/nutrition_screening/treatment:label">
            <value>व्याख्या</value>
          </text>
        </translation>
      </itext>
      <instance>
        <nutrition_screening delimiter="#" id="nutrition_screening" prefix="J1!nutrition_screening!" version="2022-03-04 11-21">
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
          <child_name/>
          <patient_id/>
          <dob/>
          <age_in_days/>
          <wfa/>
          <hfa/>
          <wfh/>
          <c_reason/>
          <c_program/>
          <c_facility/>
          <measurements>
            <gender/>
            <weight/>
            <height/>
            <muac/>
          </measurements>
          <treatment>
            <n_zscore/>
            <n_wfa/>
            <n_wfa_s_malnourished/>
            <n_wfa_m_malnourished/>
            <n_wfa_normal/>
            <n_wfa_overweight/>
            <n_wfa_obese/>
            <n_hfa/>
            <n_hfa_s_stunted/>
            <n_hfa_m_stunted/>
            <n_hfa_stunted/>
            <n_hfa_high/>
            <n_wfh/>
            <n_wfh_s_wasted/>
            <n_wfh_m_wasted/>
            <n_wfh_normal/>
            <n_wfh_overwweight/>
            <enroll/>
            <reason/>
            <admission_type/>
            <admission_criteria/>
            <program/>
            <n_otp/>
            <n_sfp/>
            <n_sc/>
            <facility/>
            <target_weight/>
            <target_muac/>
            <other_facility/>
            <additional_notes/>
          </treatment>
          <summary>
            <n_1/>
            <n_2/>
            <n_3/>
            <n_4/>
            <n_5/>
            <n_6/>
            <n_7/>
            <n_8/>
            <n_9/>
            <n_10/>
            <n_11/>
            <n_12/>
            <n_13/>
            <n_14/>
            <n_15/>
            <n_16/>
            <n_17/>
            <n_18/>
            <n_19/>
            <n_20/>
            <n_21/>
            <n_22/>
            <n_23/>
            <n_24/>
            <n_25/>
            <n_26/>
            <n_27/>
            <n_28/>
            <n_29/>
            <n_30/>
            <n_31/>
            <n_32/>
            <n_33/>
            <n_34/>
            <n_36/>
            <n_37/>
            <n_38/>
          </summary>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </nutrition_screening>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/nutrition_screening/inputs" relevant="./source = 'user'"/>
      <bind nodeset="/nutrition_screening/inputs/source" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/source_id" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/contact/_id" type="db:person"/>
      <bind nodeset="/nutrition_screening/inputs/contact/name" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/contact/patient_id" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/contact/date_of_birth" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/contact/parent/contact/phone" type="string"/>
      <bind nodeset="/nutrition_screening/inputs/contact/parent/contact/name" type="string"/>
      <bind calculate="../inputs/contact/_id" nodeset="/nutrition_screening/patient_uuid" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/nutrition_screening/patient_name" type="string"/>
      <bind calculate="../inputs/contact/name" nodeset="/nutrition_screening/child_name" type="string"/>
      <bind calculate="../inputs/contact/patient_id" nodeset="/nutrition_screening/patient_id" type="string"/>
      <bind calculate="substr(../inputs/contact/date_of_birth, 0, 10)" nodeset="/nutrition_screening/dob" type="string"/>
      <bind calculate="int(decimal-date-time(today()) - decimal-date-time(date( /nutrition_screening/dob )))" nodeset="/nutrition_screening/age_in_days" type="string"/>
      <bind calculate="round(z-score('weight-for-age',  /nutrition_screening/measurements/gender ,  /nutrition_screening/age_in_days ,  /nutrition_screening/measurements/weight ), 1)" nodeset="/nutrition_screening/wfa" type="string"/>
      <bind calculate="round(z-score('height-for-age',  /nutrition_screening/measurements/gender ,  /nutrition_screening/age_in_days ,  /nutrition_screening/measurements/height ), 1)" nodeset="/nutrition_screening/hfa" type="string"/>
      <bind calculate="round(z-score('weight-for-height',  /nutrition_screening/measurements/gender ,  /nutrition_screening/measurements/height ,  /nutrition_screening/measurements/weight ), 1)" nodeset="/nutrition_screening/wfh" type="string"/>
      <bind calculate="jr:choice-name( /nutrition_screening/treatment/reason , ' /nutrition_screening/treatment/reason ')" nodeset="/nutrition_screening/c_reason" type="string"/>
      <bind calculate="jr:choice-name( /nutrition_screening/treatment/program , ' /nutrition_screening/treatment/program ')" nodeset="/nutrition_screening/c_program" type="string"/>
      <bind calculate="jr:choice-name( /nutrition_screening/treatment/facility , ' /nutrition_screening/treatment/facility ')" nodeset="/nutrition_screening/c_facility" type="string"/>
      <bind nodeset="/nutrition_screening/measurements/gender" required="true()" type="select1"/>
      <bind constraint=". &gt;= 0.8 and . &lt;= 68.5" jr:constraintMsg="jr:itext('/nutrition_screening/measurements/weight:jr:constraintMsg')" nodeset="/nutrition_screening/measurements/weight" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 45 and . &lt;= 120" jr:constraintMsg="jr:itext('/nutrition_screening/measurements/height:jr:constraintMsg')" nodeset="/nutrition_screening/measurements/height" required="true()" type="decimal"/>
      <bind constraint=". &gt;= 5 and . &lt;= 30" jr:constraintMsg="jr:itext('/nutrition_screening/measurements/muac:jr:constraintMsg')" nodeset="/nutrition_screening/measurements/muac" relevant=" /nutrition_screening/age_in_days  &gt;= 180" required="false()" type="decimal"/>
      <bind nodeset="/nutrition_screening/treatment/n_zscore" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa_s_malnourished" readonly="true()" relevant=" /nutrition_screening/wfa  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa_m_malnourished" readonly="true()" relevant=" /nutrition_screening/wfa  &lt; -2 and  /nutrition_screening/wfa  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa_normal" readonly="true()" relevant=" /nutrition_screening/wfa  &lt;= 2 and  /nutrition_screening/wfa  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa_overweight" readonly="true()" relevant=" /nutrition_screening/wfa  &gt; 2 and  /nutrition_screening/wfa  &lt;= 3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfa_obese" readonly="true()" relevant=" /nutrition_screening/wfa  &gt; 3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_hfa" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_hfa_s_stunted" readonly="true()" relevant=" /nutrition_screening/hfa  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_hfa_m_stunted" readonly="true()" relevant=" /nutrition_screening/hfa  &lt; -2 and  /nutrition_screening/hfa  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_hfa_stunted" readonly="true()" relevant=" /nutrition_screening/hfa  &lt;= 2 and  /nutrition_screening/hfa  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_hfa_high" readonly="true()" relevant=" /nutrition_screening/hfa  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfh" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfh_s_wasted" readonly="true()" relevant=" /nutrition_screening/wfh  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfh_m_wasted" readonly="true()" relevant=" /nutrition_screening/wfh  &lt; -2 and  /nutrition_screening/wfh  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfh_normal" readonly="true()" relevant=" /nutrition_screening/wfh  &lt;= 2 and  /nutrition_screening/wfh  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_wfh_overwweight" readonly="true()" relevant=" /nutrition_screening/wfh  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/enroll" required="true()" type="select1"/>
      <bind nodeset="/nutrition_screening/treatment/reason" relevant=" /nutrition_screening/treatment/enroll  = 'no'" required="true()" type="select1"/>
      <bind nodeset="/nutrition_screening/treatment/admission_type" relevant=" /nutrition_screening/treatment/enroll  = 'yes'" required="true()" type="select1"/>
      <bind nodeset="/nutrition_screening/treatment/admission_criteria" relevant=" /nutrition_screening/treatment/enroll  = 'yes'" required="true()" type="select"/>
      <bind nodeset="/nutrition_screening/treatment/program" relevant=" /nutrition_screening/treatment/enroll  = 'yes'" required="true()" type="select1"/>
      <bind nodeset="/nutrition_screening/treatment/n_otp" readonly="true()" relevant=" /nutrition_screening/treatment/program  = 'OTP'" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_sfp" readonly="true()" relevant=" /nutrition_screening/treatment/program  = 'SFP'" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/n_sc" readonly="true()" relevant=" /nutrition_screening/treatment/program  = 'SC'" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/facility" relevant=" /nutrition_screening/treatment/enroll  = 'yes'" required="true()" type="select1"/>
      <bind constraint=". &gt;= 0.8 and . &lt;= 68.5" jr:constraintMsg="jr:itext('/nutrition_screening/treatment/target_weight:jr:constraintMsg')" nodeset="/nutrition_screening/treatment/target_weight" relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" type="decimal"/>
      <bind constraint=". &gt;= 5 and . &lt;= 30" jr:constraintMsg="jr:itext('/nutrition_screening/treatment/target_muac:jr:constraintMsg')" nodeset="/nutrition_screening/treatment/target_muac" relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" type="decimal"/>
      <bind nodeset="/nutrition_screening/treatment/other_facility" relevant=" /nutrition_screening/treatment/facility  = 'other_clinic'" required="true()" type="string"/>
      <bind nodeset="/nutrition_screening/treatment/additional_notes" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_1" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_2" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_3" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_4" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_5" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_6" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_7" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_8" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_9" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_10" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_11" readonly="true()" relevant=" /nutrition_screening/wfa  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_12" readonly="true()" relevant=" /nutrition_screening/wfa  &lt; -2 and  /nutrition_screening/wfa  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_13" readonly="true()" relevant=" /nutrition_screening/wfa  &lt;= 2 and  /nutrition_screening/wfa  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_14" readonly="true()" relevant=" /nutrition_screening/wfa  &gt; 2 and  /nutrition_screening/wfa  &lt;= 3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_15" readonly="true()" relevant=" /nutrition_screening/wfa  &gt; 3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_16" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_17" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_18" readonly="true()" relevant=" /nutrition_screening/hfa  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_19" readonly="true()" relevant=" /nutrition_screening/hfa  &lt; -2 and  /nutrition_screening/hfa  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_20" readonly="true()" relevant=" /nutrition_screening/hfa  &lt;= 2 and  /nutrition_screening/hfa  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_21" readonly="true()" relevant=" /nutrition_screening/hfa  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_22" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_23" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_24" readonly="true()" relevant=" /nutrition_screening/wfh  &lt; -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_25" readonly="true()" relevant=" /nutrition_screening/wfh  &lt; -2 and  /nutrition_screening/wfh  &gt;= -3" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_26" readonly="true()" relevant=" /nutrition_screening/wfh  &lt;= 2 and  /nutrition_screening/wfh  &gt;= -2" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_27" readonly="true()" relevant=" /nutrition_screening/wfh  &gt; 2" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_28" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_29" readonly="true()" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_30" readonly="true()" relevant=" /nutrition_screening/treatment/enroll  = 'yes'" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_31" readonly="true()" relevant=" /nutrition_screening/treatment/facility  = 'other_clinic'" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_32" readonly="true()" relevant=" /nutrition_screening/treatment/enroll  = 'yes' and  /nutrition_screening/treatment/facility  = 'clinic'" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_33" readonly="true()" relevant=" /nutrition_screening/treatment/target_weight  != ''" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_34" readonly="true()" relevant=" /nutrition_screening/treatment/target_muac  != ''" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_36" readonly="true()" relevant=" /nutrition_screening/treatment/enroll  = 'no'" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_37" readonly="true()" relevant=" /nutrition_screening/treatment/additional_notes  != ''" type="string"/>
      <bind nodeset="/nutrition_screening/summary/n_38" readonly="true()" relevant=" /nutrition_screening/treatment/additional_notes  != ''" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/nutrition_screening/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/nutrition_screening/inputs">
      <label ref="jr:itext('/nutrition_screening/inputs:label')"/>
      <input appearance="hidden" ref="/nutrition_screening/inputs/source"/>
      <input appearance="hidden" ref="/nutrition_screening/inputs/source_id"/>
      <group ref="/nutrition_screening/inputs/contact">
        <input appearance="db-object" ref="/nutrition_screening/inputs/contact/_id">
          <label ref="jr:itext('/nutrition_screening/inputs/contact/_id:label')"/>
          <hint>Select a person from list</hint>
        </input>
        <input appearance="hidden" ref="/nutrition_screening/inputs/contact/name"/>
        <input appearance="hidden" ref="/nutrition_screening/inputs/contact/patient_id"/>
        <input appearance="hidden" ref="/nutrition_screening/inputs/contact/date_of_birth"/>
        <group ref="/nutrition_screening/inputs/contact/parent">
          <group ref="/nutrition_screening/inputs/contact/parent/contact">
            <input appearance="hidden" ref="/nutrition_screening/inputs/contact/parent/contact/phone"/>
            <input appearance="hidden" ref="/nutrition_screening/inputs/contact/parent/contact/name"/>
          </group>
        </group>
      </group>
    </group>
    <group appearance="field-list" ref="/nutrition_screening/measurements">
      <label ref="jr:itext('/nutrition_screening/measurements:label')"/>
      <select1 ref="/nutrition_screening/measurements/gender">
        <label ref="jr:itext('/nutrition_screening/measurements/gender:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/measurements/gender/male:label')"/>
          <value>male</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/measurements/gender/female:label')"/>
          <value>female</value>
        </item>
      </select1>
      <input ref="/nutrition_screening/measurements/weight">
        <label ref="jr:itext('/nutrition_screening/measurements/weight:label')"/>
      </input>
      <input ref="/nutrition_screening/measurements/height">
        <label ref="jr:itext('/nutrition_screening/measurements/height:label')"/>
      </input>
      <input ref="/nutrition_screening/measurements/muac">
        <label ref="jr:itext('/nutrition_screening/measurements/muac:label')"/>
      </input>
    </group>
    <group appearance="field-list" ref="/nutrition_screening/treatment">
      <label ref="jr:itext('/nutrition_screening/treatment:label')"/>
      <input ref="/nutrition_screening/treatment/n_zscore">
        <label ref="jr:itext('/nutrition_screening/treatment/n_zscore:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa_s_malnourished">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa_s_malnourished:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa_m_malnourished">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa_m_malnourished:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa_normal">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa_normal:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa_overweight">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa_overweight:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfa_obese">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfa_obese:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_hfa">
        <label ref="jr:itext('/nutrition_screening/treatment/n_hfa:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_hfa_s_stunted">
        <label ref="jr:itext('/nutrition_screening/treatment/n_hfa_s_stunted:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_hfa_m_stunted">
        <label ref="jr:itext('/nutrition_screening/treatment/n_hfa_m_stunted:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_hfa_stunted">
        <label ref="jr:itext('/nutrition_screening/treatment/n_hfa_stunted:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_hfa_high">
        <label ref="jr:itext('/nutrition_screening/treatment/n_hfa_high:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfh">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfh:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfh_s_wasted">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfh_s_wasted:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfh_m_wasted">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfh_m_wasted:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfh_normal">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfh_normal:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_wfh_overwweight">
        <label ref="jr:itext('/nutrition_screening/treatment/n_wfh_overwweight:label')"/>
      </input>
      <select1 ref="/nutrition_screening/treatment/enroll">
        <label ref="jr:itext('/nutrition_screening/treatment/enroll:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/enroll/yes:label')"/>
          <value>yes</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/enroll/no:label')"/>
          <value>no</value>
        </item>
      </select1>
      <select1 ref="/nutrition_screening/treatment/reason">
        <label ref="jr:itext('/nutrition_screening/treatment/reason:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/reason/false_positive:label')"/>
          <value>false_positive</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/reason/chronic_malnutrition:label')"/>
          <value>chronic_malnutrition</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/reason/status_check:label')"/>
          <value>status_check</value>
        </item>
      </select1>
      <select1 ref="/nutrition_screening/treatment/admission_type">
        <label ref="jr:itext('/nutrition_screening/treatment/admission_type:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/new_case:label')"/>
          <value>new_case</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/relapse:label')"/>
          <value>relapse</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/otp:label')"/>
          <value>otp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/sfp:label')"/>
          <value>sfp</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/sc:label')"/>
          <value>sc</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_type/defaulter:label')"/>
          <value>defaulter</value>
        </item>
      </select1>
      <select ref="/nutrition_screening/treatment/admission_criteria">
        <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/oedema_1_2:label')"/>
          <value>oedema_1_2</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/oedema_3:label')"/>
          <value>oedema_3</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/muac_115:label')"/>
          <value>muac_115</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/muac_115_complications:label')"/>
          <value>muac_115_complications</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/muac_115_124:label')"/>
          <value>muac_115_124</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/wfh_-3:label')"/>
          <value>wfh_-3</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/wfh_-3_complications:label')"/>
          <value>wfh_-3_complications</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/admission_criteria/wfh_-3_-2:label')"/>
          <value>wfh_-3_-2</value>
        </item>
      </select>
      <select1 ref="/nutrition_screening/treatment/program">
        <label ref="jr:itext('/nutrition_screening/treatment/program:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/program/OTP:label')"/>
          <value>OTP</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/program/SFP:label')"/>
          <value>SFP</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/program/SC:label')"/>
          <value>SC</value>
        </item>
      </select1>
      <input ref="/nutrition_screening/treatment/n_otp">
        <label ref="jr:itext('/nutrition_screening/treatment/n_otp:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_sfp">
        <label ref="jr:itext('/nutrition_screening/treatment/n_sfp:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/n_sc">
        <label ref="jr:itext('/nutrition_screening/treatment/n_sc:label')"/>
      </input>
      <select1 ref="/nutrition_screening/treatment/facility">
        <label ref="jr:itext('/nutrition_screening/treatment/facility:label')"/>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/facility/clinic:label')"/>
          <value>clinic</value>
        </item>
        <item>
          <label ref="jr:itext('/nutrition_screening/treatment/facility/other_clinic:label')"/>
          <value>other_clinic</value>
        </item>
      </select1>
      <input ref="/nutrition_screening/treatment/target_weight">
        <label ref="jr:itext('/nutrition_screening/treatment/target_weight:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/target_muac">
        <label ref="jr:itext('/nutrition_screening/treatment/target_muac:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/other_facility">
        <label ref="jr:itext('/nutrition_screening/treatment/other_facility:label')"/>
      </input>
      <input ref="/nutrition_screening/treatment/additional_notes">
        <label ref="jr:itext('/nutrition_screening/treatment/additional_notes:label')"/>
      </input>
    </group>
    <group appearance="field-list summary" ref="/nutrition_screening/summary">
      <input appearance="h1 yellow" ref="/nutrition_screening/summary/n_1">
        <label ref="jr:itext('/nutrition_screening/summary/n_1:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_2">
        <label ref="jr:itext('/nutrition_screening/summary/n_2:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_3">
        <label ref="jr:itext('/nutrition_screening/summary/n_3:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_4">
        <label ref="jr:itext('/nutrition_screening/summary/n_4:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/nutrition_screening/summary/n_5">
        <label ref="jr:itext('/nutrition_screening/summary/n_5:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_6">
        <label ref="jr:itext('/nutrition_screening/summary/n_6:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_7">
        <label ref="jr:itext('/nutrition_screening/summary/n_7:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_8">
        <label ref="jr:itext('/nutrition_screening/summary/n_8:label')"/>
      </input>
      <input appearance="h2 blue" ref="/nutrition_screening/summary/n_9">
        <label ref="jr:itext('/nutrition_screening/summary/n_9:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_10">
        <label ref="jr:itext('/nutrition_screening/summary/n_10:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_11">
        <label ref="jr:itext('/nutrition_screening/summary/n_11:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_12">
        <label ref="jr:itext('/nutrition_screening/summary/n_12:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_13">
        <label ref="jr:itext('/nutrition_screening/summary/n_13:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_14">
        <label ref="jr:itext('/nutrition_screening/summary/n_14:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_15">
        <label ref="jr:itext('/nutrition_screening/summary/n_15:label')"/>
      </input>
      <input appearance="h2 blue" ref="/nutrition_screening/summary/n_16">
        <label ref="jr:itext('/nutrition_screening/summary/n_16:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_17">
        <label ref="jr:itext('/nutrition_screening/summary/n_17:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_18">
        <label ref="jr:itext('/nutrition_screening/summary/n_18:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_19">
        <label ref="jr:itext('/nutrition_screening/summary/n_19:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_20">
        <label ref="jr:itext('/nutrition_screening/summary/n_20:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_21">
        <label ref="jr:itext('/nutrition_screening/summary/n_21:label')"/>
      </input>
      <input appearance="h2 blue" ref="/nutrition_screening/summary/n_22">
        <label ref="jr:itext('/nutrition_screening/summary/n_22:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_23">
        <label ref="jr:itext('/nutrition_screening/summary/n_23:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_24">
        <label ref="jr:itext('/nutrition_screening/summary/n_24:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_25">
        <label ref="jr:itext('/nutrition_screening/summary/n_25:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_26">
        <label ref="jr:itext('/nutrition_screening/summary/n_26:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_27">
        <label ref="jr:itext('/nutrition_screening/summary/n_27:label')"/>
      </input>
      <input appearance="h1 yellow" ref="/nutrition_screening/summary/n_28">
        <label ref="jr:itext('/nutrition_screening/summary/n_28:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_29">
        <label ref="jr:itext('/nutrition_screening/summary/n_29:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_30">
        <label ref="jr:itext('/nutrition_screening/summary/n_30:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_31">
        <label ref="jr:itext('/nutrition_screening/summary/n_31:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_32">
        <label ref="jr:itext('/nutrition_screening/summary/n_32:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_33">
        <label ref="jr:itext('/nutrition_screening/summary/n_33:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_34">
        <label ref="jr:itext('/nutrition_screening/summary/n_34:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_36">
        <label ref="jr:itext('/nutrition_screening/summary/n_36:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_37">
        <label ref="jr:itext('/nutrition_screening/summary/n_37:label')"/>
      </input>
      <input ref="/nutrition_screening/summary/n_38">
        <label ref="jr:itext('/nutrition_screening/summary/n_38:label')"/>
      </input>
    </group>
  </h:body>
</h:html>
`,   
};
