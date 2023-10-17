/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix" dir="ltr" data-form-id="contact:health_center:edit">
<section class="form-logo"></section><h3 dir="auto" id="form-title">Edit Health Center</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group-data or-branch pre-init " name="/data/inputs" data-relevant="false()"><section class="or-group-data " name="/data/inputs/user"><label class="question non-select "><input type="text" name="/data/inputs/user/contact_id" data-type-xml="string"></label><label class="question non-select "><input type="text" name="/data/inputs/user/facility_id" data-type-xml="string"></label><label class="question non-select "><input type="text" name="/data/inputs/user/name" data-type-xml="string"></label>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list " name="/data/health_center"><section class="or-group-data " name="/data/health_center/contact"><label class="question non-select or-appearance-hidden "><input type="text" name="/data/health_center/contact/name" data-type-xml="string"></label><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/data/health_center/contact/_id:label">Primary Contact</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/contact/_id:label">Contact primaire</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/contact/_id:label">प्राथमिक कॉंटॅक्ट</span><span lang="id" class="question-label " data-itext-id="/data/health_center/contact/_id:label">Kontak Utama</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/contact/_id:label">प्राथमिक सम्पर्क व्यक्ति</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/contact/_id:label">Mwasiliwa mkuu</span><span lang="en" class="or-hint active" data-itext-id="/data/health_center/contact/_id:hint">Select the Primary Contact</span><span lang="fr" class="or-hint " data-itext-id="/data/health_center/contact/_id:hint">Sélectionnez le contact primaire</span><span lang="hi" class="or-hint " data-itext-id="/data/health_center/contact/_id:hint">प्राथमिक कॉंटॅक्ट चुनें</span><span lang="id" class="or-hint " data-itext-id="/data/health_center/contact/_id:hint">Pilih Kontak Utama</span><span lang="ne" class="or-hint " data-itext-id="/data/health_center/contact/_id:hint">प्राथमिक सम्पर्क व्यक्ति छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/health_center/contact/_id:hint">Chagua Mwasiliwa mkuu</span><input type="text" name="/data/health_center/contact/_id" data-type-xml="person"></label>
      </section><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/is_name_generated:label">Would you like to name the place after the primary contact: "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Voulez-vous nommer l'endroit: "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">क्या आप इस स्थान को प्राथमिक कॉंटॅक्ट का नाम देना चाहेंगे "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span lang="id" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Apakah Anda ingin nama tempat setelah kontak utama: "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">के तपाई यस स्थानको प्राथमिक सम्पर्क व्यक्तिलाई नाम दिन चाहनुहुन्छ "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Je, Ungependa kuita eneo hii kama mwasilishi mkuu wa eneo hii? "<span class="or-output" data-value=" /data/health_center/generated_name "> </span>"?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/health_center/is_name_generated" data-name="/data/health_center/is_name_generated" value="true" data-required="true()" data-relevant="not( /data/health_center/contact/_id ) or selected( . , 'true') or boolean( /data/health_center/contact/_id )" data-calculate="if(  /data/health_center/generated_name  = ../name, 'true', 'false')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/health_center/is_name_generated/true:label">Yes</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">हो</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Ndio</span></label><label class=""><input type="radio" name="/data/health_center/is_name_generated" data-name="/data/health_center/is_name_generated" value="false" data-required="true()" data-relevant="not( /data/health_center/contact/_id ) or selected( . , 'true') or boolean( /data/health_center/contact/_id )" data-calculate="if(  /data/health_center/generated_name  = ../name, 'true', 'false')" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/health_center/is_name_generated/false:label">No, I want to name it manually</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Non, je veux nommer ça manuellement</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">नहीं, मैं इसे मैन्युअल रूप से नाम देना चाहता हूं</span><span lang="id" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Tidak, saya ingin nama itu secara manual</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">होइन, म आफैँ नाम दिन चाहन्छु</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Hapana, ningependa kuijaza mwenyewe</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/health_center/name:label">Name of this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="question-label " data-itext-id="/data/health_center/name:label">Nom pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="question-label " data-itext-id="/data/health_center/name:label">इस स्थान का नाम <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="id" class="question-label " data-itext-id="/data/health_center/name:label">Masukkan nama tempat ini</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/name:label">यस स्थानको नाम लेख्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/name:label">Jaza jina la eneo hii</span><span class="required">*</span><input type="text" name="/data/health_center/name" data-required="true()" data-relevant="boolean( /data/health_center/contact/_id ) or not( /data/health_center/contact/_id ) or not(selected( /data/health_center/is_name_generated , 'true')) or not(selected( /data/health_center/is_name_generated , 'yes'))" data-calculate="if( ( selected( /data/health_center/is_name_generated , 'true') or selected( /data/health_center/is_name_generated , 'yes') ),  /data/health_center/generated_name , .)" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/health_center/external_id:label">External ID</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/external_id:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/external_id:label">बाहरी ID</span><span lang="id" class="question-label " data-itext-id="/data/health_center/external_id:label">Eksternal ID</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/external_id:label">बाहिरी ID</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/external_id:label">Namba ya nje</span><input type="text" name="/data/health_center/external_id" data-type-xml="string"></label><fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/use_cases:label">Health programs</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/use_cases:label">Cas d'utilisation</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/use_cases:label">स्वास्थ्य कार्यक्रम</span><span lang="id" class="question-label " data-itext-id="/data/health_center/use_cases:label">Program Kesehatan</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/use_cases:label">स्वास्थ्य कार्यक्रम</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/use_cases:label">Huduma za afya</span><span lang="en" class="or-hint active" data-itext-id="/data/health_center/use_cases:hint">Select all needed for this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Sélectionnez tout ce dont vous avez besoin pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">इस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> के लिए आवश्यक सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Pilih semua yang diperlukan untuk ini <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="ne" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">यस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> का लागि आवश्यक सब छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Chagua zote zinazohitajika kwa hii <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/data/health_center/use_cases" value="anc" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/anc:label">Antenatal care</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Soins prénataux</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">गर्भावस्था की देखभाल</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Perawatan Antenatal</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">पूर्व प्रसुती स्याहार</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Huduma ya kabla ya kuzaa</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="pnc" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/pnc:label">Postnatal care</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Soins postnataux</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">गर्भावस्था के बाद की देखभाल</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Perawatan Setelah Melahirkan</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">प्रसुती पश्चातको स्याहार</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Huduma ya baada ya kuzaa</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="imm" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/imm:label">Immunizations</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Vaccination</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">टीकाकरण</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Imunisasi</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">खोप</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Chanjo</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="gmp" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/gmp:label">Growth monitoring (nutrition)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Surveillance de la croissance</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">विकास की निगरानी</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Pemantauan Pertumbuhan</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">विकास अनुगमन</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Ufuatiliaji wa Ukuaji</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/vaccines:label">Select vaccines</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/vaccines:label">Vaccins</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/vaccines:label">टीकाकरण चुनें</span><span lang="id" class="question-label " data-itext-id="/data/health_center/vaccines:label">Pilih Jenis Vaksin</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/vaccines:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/vaccines:label">-</span><span lang="en" class="or-hint active" data-itext-id="/data/health_center/vaccines:hint">Select all needed for this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Sélectionnez tout ce dont vous avez besoin pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">इस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> के लिए आवश्यक सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Pilih semua yang diperlukan untuk ini <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="ne" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">यस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> का लागि आवश्यक सब छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Chagua zote zinazohitajika kwa hii <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/data/health_center/vaccines" value="bcg" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="cholera" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/cholera:label">Cholera</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Choléra</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Cholera</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Kolera</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hep_a" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hépatite A</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hep_b" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hpv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (virus du papillome humain)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="flu" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Grippe</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="jap_enc" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Encéphalite japonaise</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="meningococcal" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Méningocoque</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="mmr" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (rougeole, oreillons, rubéole)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="mmrv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (rougeole, oreillons, rubéole, varicelle)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="ipv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Polio inactivée</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="fipv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="polio" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Polio</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="penta" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Penta</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="pneumococcal" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumo</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="rotavirus" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rota</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="typhoid" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoïde</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="vitamin_a" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamine A</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="yellow_fever" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Fièvre jaune</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="dpt" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/data/health_center/notes:label">Notes</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/notes:label">Notes</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/notes:label">नोट्स</span><span lang="id" class="question-label " data-itext-id="/data/health_center/notes:label">Catatan</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/notes:label">टिप्पणी</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/notes:label">Maelezo</span><textarea name="/data/health_center/notes" data-type-xml="string"></textarea></label><section class="or-group-data or-appearance-hidden " name="/data/health_center/meta">
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list or-appearance-hidden " name="/data/init"><fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="district_hospital" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/district_hospital:label">District</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">District</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">ज़िला</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">Kabupaten</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">जिल्ला</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">Wilaya</span></label><label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="health_center" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/health_center:label">Health Center</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Centre de santé</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/health_center:label">स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Fasilitas Kesehatan</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/health_center:label">स्वास्थ्य केन्द्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Kituo cha afya</span></label><label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="clinic" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/clinic:label">Area</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Zone</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/clinic:label">क्षेत्र</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Daerah</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/clinic:label">क्षेत्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Eneo</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/select_generated_name" data-name="/data/init/select_generated_name" value="district_hospital" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/select_generated_name/district_hospital:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>'s District</span><span lang="fr" class="option-label " data-itext-id="/data/init/select_generated_name/district_hospital:label">District de <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/select_generated_name/district_hospital:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span> का ज़िला</span><span lang="id" class="option-label " data-itext-id="/data/init/select_generated_name/district_hospital:label">Kabupaten <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/select_generated_name/district_hospital:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>को जिल्ला</span><span lang="sw" class="option-label " data-itext-id="/data/init/select_generated_name/district_hospital:label">WIlaya ya  <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span></label><label class=""><input type="radio" name="/data/init/select_generated_name" data-name="/data/init/select_generated_name" value="health_center" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/select_generated_name/health_center:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>'s Health Center</span><span lang="fr" class="option-label " data-itext-id="/data/init/select_generated_name/health_center:label">Centre de santé de <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/select_generated_name/health_center:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span> का स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/data/init/select_generated_name/health_center:label">Fasilitas Kesehatan <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/select_generated_name/health_center:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>को स्वास्थ्य केन्द्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/select_generated_name/health_center:label">Kituo cha afya cha  <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span></label><label class=""><input type="radio" name="/data/init/select_generated_name" data-name="/data/init/select_generated_name" value="clinic" data-calculate='"health_center"' data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/select_generated_name/clinic:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>'s Area</span><span lang="fr" class="option-label " data-itext-id="/data/init/select_generated_name/clinic:label">Zone de <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/select_generated_name/clinic:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span> का क्षेत्र</span><span lang="id" class="option-label " data-itext-id="/data/init/select_generated_name/clinic:label">Daerah <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/select_generated_name/clinic:label"><span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span>को क्षेत्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/select_generated_name/clinic:label">Eneo ya  <span class="or-output" data-value=" /data/health_center/contact/contact_name "> </span></span></label>
</div>
</fieldset></fieldset>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/data/health_center/contact/contact_name" data-calculate="../name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/generated_name" data-calculate=" /data/init/generated_name_translation " data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/geolocation" data-calculate="concat(../../inputs/meta/location/lat, concat(' ', ../../inputs/meta/location/long))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/last_edited_by" data-calculate="../../../inputs/user/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/last_edited_by_person_uuid" data-calculate="../../../inputs/user/contact_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/last_edited_by_place_uuid" data-calculate="../../../inputs/user/facility_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/init/place_type_translation" data-calculate="jr:choice-name( /data/init/place_type ,' /data/init/place_type ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/init/generated_name_translation" data-calculate="if (boolean( /data/health_center/contact/_id ), jr:choice-name( /data/init/select_generated_name ,' /data/init/select_generated_name '), '')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <data xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="contact:health_center:edit" prefix="J1!contact:health_center:edit!" version="2019-03-03_08-22">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <user>
              <contact_id/>
              <facility_id/>
              <name/>
            </user>
          </inputs>
          <health_center>
            <parent/>
            <type/>
            <contact>
              <name/>
              <contact_name/>
              <_id/>
            </contact>
            <is_name_generated/>
            <generated_name/>
            <name/>
            <external_id/>
            <use_cases/>
            <vaccines/>
            <notes/>
            <geolocation/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
              <last_edited_by/>
              <last_edited_by_person_uuid/>
              <last_edited_by_place_uuid/>
            </meta>
          </health_center>
          <init>
            <place_type/>
            <place_type_translation/>
            <select_generated_name/>
            <generated_name_translation/>
          </init>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </data>
      </instance>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Edit Health Center</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/data/health_center/contact/_id:hint">
            <value>Select the Primary Contact</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>Primary Contact</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>External ID</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>No, I want to name it manually</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>Yes</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>Would you like to name the place after the primary contact: &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Name of this <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>Antenatal care</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>Growth monitoring (nutrition)</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>Immunizations</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>Postnatal care</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>Select all needed for this <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>Health programs</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>BCG</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>Cholera</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>Diptheria, Pertussis, and Tetanus (DPT)</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>Fractional inactivated polio</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>Influenza</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>Hepatitis A</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>Hepatitis B</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>HPV (Human Papillomavirus)</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>Inactivated Polio</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>Japanese Encephalitis</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>Meningococcal</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>MMR (Measles, Mumps, Rubella)</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>MMRV (Measles, Mumps, Rubella, Varicella)</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>Pentavalent</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>Pneumococcal Pneumonia</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>Oral Polio</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>Rotavirus</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>Typhoid</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>Vitamin A</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>Yellow Fever</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>Select all needed for this <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>Select vaccines</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>Area</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>District</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>Health Center</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value><output value=" /data/health_center/contact/contact_name "/>'s Area</value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value><output value=" /data/health_center/contact/contact_name "/>'s District</value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value><output value=" /data/health_center/contact/contact_name "/>'s Health Center</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/data/health_center/contact/_id:hint">
            <value>Sélectionnez le contact primaire</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>Contact primaire</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>Non, je veux nommer ça manuellement</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>Oui</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>Voulez-vous nommer l'endroit: &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Nom pour <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>Soins prénataux</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>Surveillance de la croissance</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>Vaccination</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>Soins postnataux</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>Sélectionnez tout ce dont vous avez besoin pour <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>Cas d'utilisation</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>BCG</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>Choléra</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>Grippe</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>Hépatite A</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>HPV (virus du papillome humain)</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>Polio inactivée</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>Encéphalite japonaise</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>Méningocoque</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>MMR (rougeole, oreillons, rubéole)</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>MMRV (rougeole, oreillons, rubéole, varicelle)</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>Penta</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>Pneumo</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>Polio</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>Rota</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>Typhoïde</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>Vitamine A</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>Fièvre jaune</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>Sélectionnez tout ce dont vous avez besoin pour <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>Vaccins</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>Zone</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>District</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>Centre de santé</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value>Zone de <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value>District de <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value>Centre de santé de <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/data/health_center/contact/_id:hint">
            <value>प्राथमिक कॉंटॅक्ट चुनें</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>प्राथमिक कॉंटॅक्ट</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>बाहरी ID</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>नहीं, मैं इसे मैन्युअल रूप से नाम देना चाहता हूं</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>हाँ</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>क्या आप इस स्थान को प्राथमिक कॉंटॅक्ट का नाम देना चाहेंगे &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>इस स्थान का नाम <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>नोट्स</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>गर्भावस्था की देखभाल</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>विकास की निगरानी</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>टीकाकरण</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>गर्भावस्था के बाद की देखभाल</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>इस <output value=" /data/init/place_type_translation "/> के लिए आवश्यक सभी का चयन करें</value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>स्वास्थ्य कार्यक्रम</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>BCG</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>Cholera</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>Diptheria, Pertussis, and Tetanus (DPT)</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>Fractional inactivated polio</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>Influenza</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>Hepatitis A</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>Hepatitis B</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>HPV (Human Papillomavirus)</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>Inactivated Polio</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>Japanese Encephalitis</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>Meningococcal</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>MMR (Measles, Mumps, Rubella)</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>MMRV (Measles, Mumps, Rubella, Varicella)</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>Pentavalent</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>Pneumococcal Pneumonia</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>Oral Polio</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>Rotavirus</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>Typhoid</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>Vitamin A</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>Yellow Fever</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>इस <output value=" /data/init/place_type_translation "/> के लिए आवश्यक सभी का चयन करें</value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>टीकाकरण चुनें</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>क्षेत्र</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>ज़िला</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>स्वास्थ्य केंद्र</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value><output value=" /data/health_center/contact/contact_name "/> का क्षेत्र</value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value><output value=" /data/health_center/contact/contact_name "/> का ज़िला</value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value><output value=" /data/health_center/contact/contact_name "/> का स्वास्थ्य केंद्र</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/data/health_center/contact/_id:hint">
            <value>Pilih Kontak Utama</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>Kontak Utama</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>Eksternal ID</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>Tidak, saya ingin nama itu secara manual</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>Iya</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>Apakah Anda ingin nama tempat setelah kontak utama: &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Masukkan nama tempat ini</value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>Catatan</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>Perawatan Antenatal</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>Pemantauan Pertumbuhan</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>Imunisasi</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>Perawatan Setelah Melahirkan</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>Pilih semua yang diperlukan untuk ini <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>Program Kesehatan</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>BCG</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>Kolera</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>Diptheria, Pertussis, and Tetanus (DPT)</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>Fractional inactivated polio</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>Influenza</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>Hepatitis A</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>Hepatitis B</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>HPV (Human Papillomavirus)</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>Inactivated Polio</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>Japanese Encephalitis</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>Meningococcal</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>MMR (Measles, Mumps, Rubella)</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>MMRV (Measles, Mumps, Rubella, Varicella)</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>Pentavalent</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>Pneumococcal Pneumonia</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>Oral Polio</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>Rotavirus</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>Typhoid</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>Vitamin A</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>Yellow Fever</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>Pilih semua yang diperlukan untuk ini <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>Pilih Jenis Vaksin</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>Daerah</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>Kabupaten</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>Fasilitas Kesehatan</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value>Daerah <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value>Kabupaten <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value>Fasilitas Kesehatan <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/data/health_center/contact/_id:hint">
            <value>प्राथमिक सम्पर्क व्यक्ति छान्नुहोस्</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>प्राथमिक सम्पर्क व्यक्ति</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>बाहिरी ID</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>होइन, म आफैँ नाम दिन चाहन्छु</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>हो</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>के तपाई यस स्थानको प्राथमिक सम्पर्क व्यक्तिलाई नाम दिन चाहनुहुन्छ &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>यस स्थानको नाम लेख्नुहोस्</value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>टिप्पणी</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>पूर्व प्रसुती स्याहार</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>विकास अनुगमन</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>खोप</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>प्रसुती पश्चातको स्याहार</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>यस <output value=" /data/init/place_type_translation "/> का लागि आवश्यक सब छान्नुहोस्</value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>स्वास्थ्य कार्यक्रम</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>यस <output value=" /data/init/place_type_translation "/> का लागि आवश्यक सब छान्नुहोस्</value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>-</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>क्षेत्र</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>जिल्ला</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>स्वास्थ्य केन्द्र</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value><output value=" /data/health_center/contact/contact_name "/>को क्षेत्र</value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value><output value=" /data/health_center/contact/contact_name "/>को जिल्ला</value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value><output value=" /data/health_center/contact/contact_name "/>को स्वास्थ्य केन्द्र</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/data/health_center/contact/_id:hint">
            <value>Chagua Mwasiliwa mkuu</value>
          </text>
          <text id="/data/health_center/contact/_id:label">
            <value>Mwasiliwa mkuu</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>Namba ya nje</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>Hapana, ningependa kuijaza mwenyewe</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>Ndio</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>Je, Ungependa kuita eneo hii kama mwasilishi mkuu wa eneo hii? &quot;<output value=" /data/health_center/generated_name "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Jaza jina la eneo hii</value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>Maelezo</value>
          </text>
          <text id="/data/health_center/use_cases/anc:label">
            <value>Huduma ya kabla ya kuzaa</value>
          </text>
          <text id="/data/health_center/use_cases/gmp:label">
            <value>Ufuatiliaji wa Ukuaji</value>
          </text>
          <text id="/data/health_center/use_cases/imm:label">
            <value>Chanjo</value>
          </text>
          <text id="/data/health_center/use_cases/pnc:label">
            <value>Huduma ya baada ya kuzaa</value>
          </text>
          <text id="/data/health_center/use_cases:hint">
            <value>Chagua zote zinazohitajika kwa hii <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/use_cases:label">
            <value>Huduma za afya</value>
          </text>
          <text id="/data/health_center/vaccines/bcg:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/cholera:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/dpt:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/fipv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/flu:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hep_a:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hep_b:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/hpv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/ipv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/jap_enc:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/meningococcal:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/mmr:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/mmrv:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/penta:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/pneumococcal:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/polio:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/rotavirus:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/typhoid:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/vitamin_a:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines/yellow_fever:label">
            <value>-</value>
          </text>
          <text id="/data/health_center/vaccines:hint">
            <value>Chagua zote zinazohitajika kwa hii <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/health_center/vaccines:label">
            <value>-</value>
          </text>
          <text id="/data/init/place_type/clinic:label">
            <value>Eneo</value>
          </text>
          <text id="/data/init/place_type/district_hospital:label">
            <value>Wilaya</value>
          </text>
          <text id="/data/init/place_type/health_center:label">
            <value>Kituo cha afya</value>
          </text>
          <text id="/data/init/select_generated_name/clinic:label">
            <value>Eneo ya  <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/district_hospital:label">
            <value>WIlaya ya  <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
          <text id="/data/init/select_generated_name/health_center:label">
            <value>Kituo cha afya cha  <output value=" /data/health_center/contact/contact_name "/></value>
          </text>
        </translation>
      </itext>
      <instance>
        <data delimiter="#" id="contact:health_center:edit" prefix="J1!contact:health_center:edit!" version="2019-03-03_08-22">
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <user>
              <contact_id/>
              <facility_id/>
              <name/>
            </user>
          </inputs>
          <health_center>
            <parent/>
            <type/>
            <contact>
              <name/>
              <contact_name/>
              <_id/>
            </contact>
            <is_name_generated/>
            <generated_name/>
            <name/>
            <external_id/>
            <use_cases/>
            <vaccines/>
            <notes/>
            <geolocation/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
              <last_edited_by/>
              <last_edited_by_person_uuid/>
              <last_edited_by_place_uuid/>
            </meta>
          </health_center>
          <init>
            <place_type/>
            <place_type_translation/>
            <select_generated_name/>
            <generated_name_translation/>
          </init>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </data>
      </instance>
      <bind nodeset="/data/inputs" relevant="false()"/>
      <bind nodeset="/data/inputs/user/contact_id" type="string"/>
      <bind nodeset="/data/inputs/user/facility_id" type="string"/>
      <bind nodeset="/data/inputs/user/name" type="string"/>
      <bind nodeset="/data/health_center/parent" readonly="true()" type="string"/>
      <bind nodeset="/data/health_center/type" readonly="true()" type="string"/>
      <bind nodeset="/data/health_center/contact/name" type="string"/>
      <bind calculate="../name" nodeset="/data/health_center/contact/contact_name" type="string"/>
      <bind nodeset="/data/health_center/contact/_id" type="db:person"/>
      <bind calculate="if(  /data/health_center/generated_name  = ../name, 'true', 'false')" nodeset="/data/health_center/is_name_generated" readonly="boolean( /data/health_center/contact/_id )" relevant="not( /data/health_center/contact/_id ) or selected( . , 'true') or boolean( /data/health_center/contact/_id )" required="true()" type="select1"/>
      <bind calculate=" /data/init/generated_name_translation " nodeset="/data/health_center/generated_name" type="string"/>
      <bind calculate="if( ( selected( /data/health_center/is_name_generated , 'true') or selected( /data/health_center/is_name_generated , 'yes') ),  /data/health_center/generated_name , .)" nodeset="/data/health_center/name" relevant="boolean( /data/health_center/contact/_id ) or not( /data/health_center/contact/_id ) or not(selected( /data/health_center/is_name_generated , 'true')) or not(selected( /data/health_center/is_name_generated , 'yes'))" required="true()" type="string"/>
      <bind nodeset="/data/health_center/external_id" type="string"/>
      <bind nodeset="/data/health_center/use_cases" relevant="../type = 'health_center'" type="select"/>
      <bind nodeset="/data/health_center/vaccines" relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" type="select"/>
      <bind nodeset="/data/health_center/notes" type="string"/>
      <bind calculate="concat(../../inputs/meta/location/lat, concat(' ', ../../inputs/meta/location/long))" nodeset="/data/health_center/geolocation" type="string"/>
      <bind nodeset="/data/health_center/meta/created_by" readonly="true()" type="string"/>
      <bind nodeset="/data/health_center/meta/created_by_person_uuid" readonly="true()" type="string"/>
      <bind nodeset="/data/health_center/meta/created_by_place_uuid" type="string"/>
      <bind calculate="../../../inputs/user/name" nodeset="/data/health_center/meta/last_edited_by" type="string"/>
      <bind calculate="../../../inputs/user/contact_id" nodeset="/data/health_center/meta/last_edited_by_person_uuid" type="string"/>
      <bind calculate="../../../inputs/user/facility_id" nodeset="/data/health_center/meta/last_edited_by_place_uuid" type="string"/>
      <bind calculate="&quot;health_center&quot;" nodeset="/data/init/place_type" type="select1"/>
      <bind calculate="jr:choice-name( /data/init/place_type ,' /data/init/place_type ')" nodeset="/data/init/place_type_translation" type="string"/>
      <bind calculate="&quot;health_center&quot;" nodeset="/data/init/select_generated_name" type="select1"/>
      <bind calculate="if (boolean( /data/health_center/contact/_id ), jr:choice-name( /data/init/select_generated_name ,' /data/init/select_generated_name '), '')" nodeset="/data/init/generated_name_translation" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/data/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body>
    <group ref="/data/inputs">
      <group ref="/data/inputs/user">
        <input ref="/data/inputs/user/contact_id"/>
        <input ref="/data/inputs/user/facility_id"/>
        <input ref="/data/inputs/user/name"/>
      </group>
    </group>
    <group appearance="field-list" ref="/data/health_center">
      <group ref="/data/health_center/contact">
        <input appearance="hidden" ref="/data/health_center/contact/name"/>
        <input appearance="db-object" ref="/data/health_center/contact/_id">
          <label ref="jr:itext('/data/health_center/contact/_id:label')"/>
          <hint ref="jr:itext('/data/health_center/contact/_id:hint')"/>
        </input>
      </group>
      <select1 ref="/data/health_center/is_name_generated">
        <label ref="jr:itext('/data/health_center/is_name_generated:label')"/>
        <item>
          <label ref="jr:itext('/data/health_center/is_name_generated/true:label')"/>
          <value>true</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/is_name_generated/false:label')"/>
          <value>false</value>
        </item>
      </select1>
      <input ref="/data/health_center/name">
        <label ref="jr:itext('/data/health_center/name:label')"/>
      </input>
      <input ref="/data/health_center/external_id">
        <label ref="jr:itext('/data/health_center/external_id:label')"/>
      </input>
      <select ref="/data/health_center/use_cases">
        <label ref="jr:itext('/data/health_center/use_cases:label')"/>
        <hint ref="jr:itext('/data/health_center/use_cases:hint')"/>
        <item>
          <label ref="jr:itext('/data/health_center/use_cases/anc:label')"/>
          <value>anc</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/use_cases/pnc:label')"/>
          <value>pnc</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/use_cases/imm:label')"/>
          <value>imm</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/use_cases/gmp:label')"/>
          <value>gmp</value>
        </item>
      </select>
      <select ref="/data/health_center/vaccines">
        <label ref="jr:itext('/data/health_center/vaccines:label')"/>
        <hint ref="jr:itext('/data/health_center/vaccines:hint')"/>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/bcg:label')"/>
          <value>bcg</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/cholera:label')"/>
          <value>cholera</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/hep_a:label')"/>
          <value>hep_a</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/hep_b:label')"/>
          <value>hep_b</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/hpv:label')"/>
          <value>hpv</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/flu:label')"/>
          <value>flu</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/jap_enc:label')"/>
          <value>jap_enc</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/meningococcal:label')"/>
          <value>meningococcal</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/mmr:label')"/>
          <value>mmr</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/mmrv:label')"/>
          <value>mmrv</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/ipv:label')"/>
          <value>ipv</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/fipv:label')"/>
          <value>fipv</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/polio:label')"/>
          <value>polio</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/penta:label')"/>
          <value>penta</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/pneumococcal:label')"/>
          <value>pneumococcal</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/rotavirus:label')"/>
          <value>rotavirus</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/typhoid:label')"/>
          <value>typhoid</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/vitamin_a:label')"/>
          <value>vitamin_a</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/yellow_fever:label')"/>
          <value>yellow_fever</value>
        </item>
        <item>
          <label ref="jr:itext('/data/health_center/vaccines/dpt:label')"/>
          <value>dpt</value>
        </item>
      </select>
      <input appearance="multiline" ref="/data/health_center/notes">
        <label ref="jr:itext('/data/health_center/notes:label')"/>
      </input>
      <group appearance="hidden" ref="/data/health_center/meta"/>
    </group>
    <group appearance="field-list hidden" ref="/data/init">
      <select1 appearance="hidden" ref="/data/init/place_type">
        <item>
          <label ref="jr:itext('/data/init/place_type/district_hospital:label')"/>
          <value>district_hospital</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/place_type/health_center:label')"/>
          <value>health_center</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/place_type/clinic:label')"/>
          <value>clinic</value>
        </item>
      </select1>
      <select1 appearance="hidden" ref="/data/init/select_generated_name">
        <item>
          <label ref="jr:itext('/data/init/select_generated_name/district_hospital:label')"/>
          <value>district_hospital</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/select_generated_name/health_center:label')"/>
          <value>health_center</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/select_generated_name/clinic:label')"/>
          <value>clinic</value>
        </item>
      </select1>
    </group>
  </h:body>
</h:html>
`,   
};
