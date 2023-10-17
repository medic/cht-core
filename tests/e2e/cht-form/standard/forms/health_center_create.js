/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" data-form-id="contact:health_center:create">
<section class="form-logo"></section><h3 dir="auto" id="form-title">New Health Center</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group-data or-branch pre-init " name="/data/inputs" data-relevant="false()"><section class="or-group-data " name="/data/inputs/user"><label class="question non-select "><input type="text" name="/data/inputs/user/contact_id" data-type-xml="string"></label><label class="question non-select "><input type="text" name="/data/inputs/user/facility_id" data-type-xml="string"></label><label class="question non-select "><input type="text" name="/data/inputs/user/name" data-type-xml="string"></label>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list " name="/data/init"><fieldset class="question simple-select ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/init/create_new_person:label">Set the Primary Contact</span><span lang="fr" class="question-label " data-itext-id="/data/init/create_new_person:label">Contact primaire</span><span lang="hi" class="question-label " data-itext-id="/data/init/create_new_person:label">प्राथमिक कॉंटॅक्ट चुनें</span><span lang="id" class="question-label " data-itext-id="/data/init/create_new_person:label">Ditetapkan Sebagai Kontak Utama</span><span lang="ne" class="question-label " data-itext-id="/data/init/create_new_person:label">प्राथमिक सम्पर्क व्यक्ति</span><span lang="sw" class="question-label " data-itext-id="/data/init/create_new_person:label">Weka mwasiliwa mkuu</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/create_new_person" data-name="/data/init/create_new_person" value="new_person" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/create_new_person/new_person:label">Create a new person</span><span lang="fr" class="option-label " data-itext-id="/data/init/create_new_person/new_person:label">Créer une nouvelle personne</span><span lang="hi" class="option-label " data-itext-id="/data/init/create_new_person/new_person:label">एक नया व्यक्ति बनाएं</span><span lang="id" class="option-label " data-itext-id="/data/init/create_new_person/new_person:label">Buat orang baru</span><span lang="ne" class="option-label " data-itext-id="/data/init/create_new_person/new_person:label">एक नया व्यक्ति बनाउनुस</span><span lang="sw" class="option-label " data-itext-id="/data/init/create_new_person/new_person:label">Ongeza mtumizi mpya</span></label><label class=""><input type="radio" name="/data/init/create_new_person" data-name="/data/init/create_new_person" value="old_person" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/create_new_person/old_person:label">Select an existing person</span><span lang="fr" class="option-label " data-itext-id="/data/init/create_new_person/old_person:label">Selectiionner une personne existant</span><span lang="hi" class="option-label " data-itext-id="/data/init/create_new_person/old_person:label">मौजूदा व्यक्ति चुनें</span><span lang="id" class="option-label " data-itext-id="/data/init/create_new_person/old_person:label">Pilih orang yang ada</span><span lang="ne" class="option-label " data-itext-id="/data/init/create_new_person/old_person:label">व्यक्ति छान्नुहोस्</span><span lang="sw" class="option-label " data-itext-id="/data/init/create_new_person/old_person:label">Chagua mtumizi aliyesajlishwa apo awali</span></label><label class=""><input type="radio" name="/data/init/create_new_person" data-name="/data/init/create_new_person" value="none" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/create_new_person/none:label">Skip this step</span><span lang="fr" class="option-label " data-itext-id="/data/init/create_new_person/none:label">Sauter cette section</span><span lang="hi" class="option-label " data-itext-id="/data/init/create_new_person/none:label">इस स्टेप को छोड़ दें</span><span lang="id" class="option-label " data-itext-id="/data/init/create_new_person/none:label">Lewati langkah ini</span><span lang="ne" class="option-label " data-itext-id="/data/init/create_new_person/none:label">एख</span><span lang="sw" class="option-label " data-itext-id="/data/init/create_new_person/none:label">Ruka hatua ii</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/data/init/select_person:label">Select the Primary Contact</span><span lang="fr" class="question-label " data-itext-id="/data/init/select_person:label">Choisisser le contact primaire</span><span lang="hi" class="question-label " data-itext-id="/data/init/select_person:label">प्राथमिक कॉंटॅक्ट चुनें</span><span lang="id" class="question-label " data-itext-id="/data/init/select_person:label">Pilih Kontak Utama</span><span lang="ne" class="question-label " data-itext-id="/data/init/select_person:label">प्राथमिक सम्पर्क व्यक्ति छान्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/init/select_person:label">Chagua Mwasiliwa mkuu</span><span class="required">*</span><input type="text" name="/data/init/select_person" data-required="true()" data-relevant="selected( /data/init/create_new_person ,'old_person')" data-type-xml="person"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select or-appearance-hidden "><input type="text" name="/data/init/name" data-type-xml="string"></label><fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/init/place_type:label">Enter the name of this place</span><span lang="fr" class="question-label " data-itext-id="/data/init/place_type:label">Nom de l'endroit</span><span lang="hi" class="question-label " data-itext-id="/data/init/place_type:label">इस स्थान का नाम दर्ज करें</span><span lang="id" class="question-label " data-itext-id="/data/init/place_type:label">Masukkan nama tempat ini</span><span lang="ne" class="question-label " data-itext-id="/data/init/place_type:label">यस स्थानको नाम लेख्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/init/place_type:label">Jaza jina la eneo hii</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="district_hospital" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/district_hospital:label">District</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">District</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">ज़िला</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">Kabupaten</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">जिल्ला</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/district_hospital:label">Wilaya</span></label><label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="health_center" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/health_center:label">Health Center</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Centre de santé</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/health_center:label">स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Fasilitas Kesehatan</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/health_center:label">स्वास्थ्य केन्द्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/health_center:label">Kituo cha afya</span></label><label class=""><input type="radio" name="/data/init/place_type" data-name="/data/init/place_type" value="clinic" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/place_type/clinic:label">Area</span><span lang="fr" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Zone</span><span lang="hi" class="option-label " data-itext-id="/data/init/place_type/clinic:label">क्षेत्र</span><span lang="id" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Daerah</span><span lang="ne" class="option-label " data-itext-id="/data/init/place_type/clinic:label">क्षेत्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/place_type/clinic:label">Eneo</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/generated_name" data-name="/data/init/generated_name" value="district_hospital" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/generated_name/district_hospital:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>'s District</span><span lang="fr" class="option-label " data-itext-id="/data/init/generated_name/district_hospital:label">District de <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/generated_name/district_hospital:label"><span class="or-output" data-value=" /data/init/contact_name "> </span> का ज़िला</span><span lang="id" class="option-label " data-itext-id="/data/init/generated_name/district_hospital:label">Kabupaten <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/generated_name/district_hospital:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>को जिल्ला</span><span lang="sw" class="option-label " data-itext-id="/data/init/generated_name/district_hospital:label">WIlaya ya  <span class="or-output" data-value=" /data/init/contact_name "> </span></span></label><label class=""><input type="radio" name="/data/init/generated_name" data-name="/data/init/generated_name" value="health_center" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/generated_name/health_center:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>'s Health Center</span><span lang="fr" class="option-label " data-itext-id="/data/init/generated_name/health_center:label">Centre de santé de <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/generated_name/health_center:label"><span class="or-output" data-value=" /data/init/contact_name "> </span> का स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/data/init/generated_name/health_center:label">Fasilitas Kesehatan <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/generated_name/health_center:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>को स्वास्थ्य केन्द्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/generated_name/health_center:label">Kituo cha afya cha  <span class="or-output" data-value=" /data/init/contact_name "> </span></span></label><label class=""><input type="radio" name="/data/init/generated_name" data-name="/data/init/generated_name" value="clinic" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/generated_name/clinic:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>'s Area</span><span lang="fr" class="option-label " data-itext-id="/data/init/generated_name/clinic:label">Zone de <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="hi" class="option-label " data-itext-id="/data/init/generated_name/clinic:label"><span class="or-output" data-value=" /data/init/contact_name "> </span> का क्षेत्र</span><span lang="id" class="option-label " data-itext-id="/data/init/generated_name/clinic:label">Daerah <span class="or-output" data-value=" /data/init/contact_name "> </span></span><span lang="ne" class="option-label " data-itext-id="/data/init/generated_name/clinic:label"><span class="or-output" data-value=" /data/init/contact_name "> </span>को क्षेत्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/generated_name/clinic:label">Eneo ya  <span class="or-output" data-value=" /data/init/contact_name "> </span></span></label>
</div>
</fieldset></fieldset>
<section class="or-group or-branch pre-init or-appearance-field-list " name="/data/contact" data-relevant="selected( /data/init/create_new_person ,'new_person')"><h4>
<span lang="en" class="question-label active" data-itext-id="/data/contact:label">New Person</span><span lang="fr" class="question-label " data-itext-id="/data/contact:label">Nouvelle personne</span><span lang="hi" class="question-label " data-itext-id="/data/contact:label">नया व्यक्ति</span><span lang="id" class="question-label " data-itext-id="/data/contact:label">Orang Baru</span><span lang="ne" class="question-label " data-itext-id="/data/contact:label">नया व्यक्ति</span><span lang="sw" class="question-label " data-itext-id="/data/contact:label">Mtu Mpya</span>
</h4>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/contact/name:label">Names</span><span lang="fr" class="question-label " data-itext-id="/data/contact/name:label">Nom</span><span lang="hi" class="question-label " data-itext-id="/data/contact/name:label">नाम</span><span lang="id" class="question-label " data-itext-id="/data/contact/name:label">Nama</span><span lang="ne" class="question-label " data-itext-id="/data/contact/name:label">नाम</span><span lang="sw" class="question-label " data-itext-id="/data/contact/name:label">Jina</span><span class="required">*</span><input type="text" name="/data/contact/name" data-required="true()" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/contact/phone:label">Phone Number</span><span lang="fr" class="question-label " data-itext-id="/data/contact/phone:label">Téléphone</span><span lang="hi" class="question-label " data-itext-id="/data/contact/phone:label">फोन नंबर</span><span lang="id" class="question-label " data-itext-id="/data/contact/phone:label">Nomor Telepon</span><span lang="ne" class="question-label " data-itext-id="/data/contact/phone:label">फाेन नम्बर</span><span lang="sw" class="question-label " data-itext-id="/data/contact/phone:label">Namba ya Simi</span><input type="tel" name="/data/contact/phone" data-constraint="true()" data-type-xml="tel"><span lang="" class="or-constraint-msg active">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/contact/phone_alternate:label">Alternate Phone Number</span><span lang="fr" class="question-label " data-itext-id="/data/contact/phone_alternate:label">Téléphone alternatif</span><span lang="hi" class="question-label " data-itext-id="/data/contact/phone_alternate:label">अन्य फोन नंबर</span><span lang="id" class="question-label " data-itext-id="/data/contact/phone_alternate:label">Nomor Telepon Alternatif</span><span lang="ne" class="question-label " data-itext-id="/data/contact/phone_alternate:label">बैकल्पिक फाेन नम्बर</span><span lang="sw" class="question-label " data-itext-id="/data/contact/phone_alternate:label">Namba Ya</span><input type="tel" name="/data/contact/phone_alternate" data-constraint="true()" data-type-xml="tel"><span lang="" class="or-constraint-msg active">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span></label><fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/contact/role:label">Role</span><span lang="fr" class="question-label " data-itext-id="/data/contact/role:label">Rôle</span><span lang="hi" class="question-label " data-itext-id="/data/contact/role:label">भूमिका</span><span lang="id" class="question-label " data-itext-id="/data/contact/role:label">Peran</span><span lang="ne" class="question-label " data-itext-id="/data/contact/role:label">भुमिका</span><span lang="sw" class="question-label " data-itext-id="/data/contact/role:label">Namba ya simu Nyingine</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="chw" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/chw:label">CHW</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/chw:label">ASC</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/chw:label">सामुदायिक स्वास्थ्य कर्मी</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/chw:label">Kader</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/chw:label">महिला स्वास्थ्य स्वयम् सेविका</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/chw:label">Mhudumu wa afya</span></label><label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="chw_supervisor" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/chw_supervisor:label">CHW Supervisor</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/chw_supervisor:label">Superviseur ASC</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/chw_supervisor:label">सामुदायिक स्वास्थ्य कर्मी के मैनेजर</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/chw_supervisor:label">Kader Pengawas</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/chw_supervisor:label">महिला स्वास्थ्य स्वयम् सेविकाको सुपरभाइजर</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/chw_supervisor:label">Mkuu wa wahudumu wa afya</span></label><label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="nurse" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/nurse:label">Nurse</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/nurse:label">Infirmier</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/nurse:label">नर्स</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/nurse:label">Perawat</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/nurse:label">नर्स</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/nurse:label">Muuguzi</span></label><label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="manager" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/manager:label">Facility Manager</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/manager:label">Staff médical</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/manager:label">स्वास्थ्य केंद्र के मैनजर</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/manager:label">Manajer Fasilitas</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/manager:label">स्वास्थ्य सस्था प्रमुख</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/manager:label">Meneja wa Kituo cha afya</span></label><label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="patient" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/patient:label">Patient</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/patient:label">Patient</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/patient:label">मरीज़</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/patient:label">Pasien</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/patient:label">बिरामी</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/patient:label">Mgonjwa</span></label><label class=""><input type="radio" name="/data/contact/role" data-name="/data/contact/role" value="other" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/contact/role/other:label">Other</span><span lang="fr" class="option-label " data-itext-id="/data/contact/role/other:label">Autre</span><span lang="hi" class="option-label " data-itext-id="/data/contact/role/other:label">अन्य</span><span lang="id" class="option-label " data-itext-id="/data/contact/role/other:label">Lain</span><span lang="ne" class="option-label " data-itext-id="/data/contact/role/other:label">अन्य</span><span lang="sw" class="option-label " data-itext-id="/data/contact/role/other:label">Nyingine</span></label>
</div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/contact/role_other:label">Specify other</span><span lang="fr" class="question-label " data-itext-id="/data/contact/role_other:label">Specifier</span><span lang="hi" class="question-label " data-itext-id="/data/contact/role_other:label">अन्य का उल्‍लेख करें</span><span lang="id" class="question-label " data-itext-id="/data/contact/role_other:label">Tentukan lainnya</span><span lang="ne" class="question-label " data-itext-id="/data/contact/role_other:label">अन्य उल्लेख गर्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/contact/role_other:label">Fafanua vingine</span><span class="required">*</span><input type="text" name="/data/contact/role_other" data-required="true()" data-relevant="selected(  /data/contact/role ,'other')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/contact/external_id:label">External ID</span><span lang="fr" class="question-label " data-itext-id="/data/contact/external_id:label">Identifiant externe</span><span lang="hi" class="question-label " data-itext-id="/data/contact/external_id:label">बाहरी ID</span><span lang="id" class="question-label " data-itext-id="/data/contact/external_id:label">Eksternal ID</span><span lang="ne" class="question-label " data-itext-id="/data/contact/external_id:label">बाहिरि ID</span><span lang="sw" class="question-label " data-itext-id="/data/contact/external_id:label">Kitambulisho cha nje</span><input type="text" name="/data/contact/external_id" data-type-xml="string"></label><label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/data/contact/notes:label">Notes</span><span lang="fr" class="question-label " data-itext-id="/data/contact/notes:label">Notes</span><span lang="hi" class="question-label " data-itext-id="/data/contact/notes:label">नोट्स</span><span lang="id" class="question-label " data-itext-id="/data/contact/notes:label">Catatan</span><span lang="ne" class="question-label " data-itext-id="/data/contact/notes:label">टिप्पणि</span><span lang="sw" class="question-label " data-itext-id="/data/contact/notes:label">Maelezo</span><textarea name="/data/contact/notes" data-type-xml="string"></textarea></label><section class="or-group-data or-appearance-hidden " name="/data/contact/meta">
      </section>
      </section>
      </section>
    <section class="or-group-data or-appearance-field-list " name="/data/health_center"><fieldset class="question simple-select or-branch pre-init ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/is_name_generated:label">Would you like to name the place after the primary contact: "<span class="or-output" data-value=" /data/init/generated_name_translation "> </span>"?</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Voulez-vous nommer l'endroit: "<span class="or-output" data-value=" /data/init/generated_name_translation "> </span>"?</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">क्या आप इस स्थान को प्राथमिक कॉंटॅक्ट का नाम देना चाहेंगे?: <span class="or-output" data-value=" /data/init/generated_name_translation "> </span></span><span lang="id" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Apakah Anda ingin nama tempat setelah kontak utama: "<span class="or-output" data-value=" /data/init/generated_name_translation "> </span>"?</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">के तपाइ यस स्थानकाे प्राथमिक सम्पर्क नाम दिन चाहानु हुन्छ?:<span class="or-output" data-value=" /data/init/generated_name_translation "> </span></span><span lang="sw" class="question-label " data-itext-id="/data/health_center/is_name_generated:label">Je, Ungependa kuita eneo hii kama mwasilishi mkuu wa eneo hii? "<span class="or-output" data-value=" /data/init/generated_name_translation "> </span>"?</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/health_center/is_name_generated" data-name="/data/health_center/is_name_generated" value="true" data-required="true()" data-relevant="not(selected( /data/init/create_new_person ,'none'))" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/health_center/is_name_generated/true:label">Yes</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Oui</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">हाँ</span><span lang="id" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Iya</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">हो</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/is_name_generated/true:label">Ndio</span></label><label class=""><input type="radio" name="/data/health_center/is_name_generated" data-name="/data/health_center/is_name_generated" value="false" data-required="true()" data-relevant="not(selected( /data/init/create_new_person ,'none'))" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/health_center/is_name_generated/false:label">No, I want to name it manually</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Non, je veux nommer ça manuellement</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">नहीं, मैं इसे मैन्युअल रूप से नाम देना चाहता हूं</span><span lang="id" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Tidak, saya ingin nama itu secara manual</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">होइन, म आफैँ नाम दिन चाहन्छु</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/is_name_generated/false:label">Hapana, ningependa kuijaza mwenyewe</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/init/custom_place_name:label">Name of this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="question-label " data-itext-id="/data/init/custom_place_name:label">Nom pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="question-label " data-itext-id="/data/init/custom_place_name:label">इस स्थान का नाम <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="id" class="question-label " data-itext-id="/data/init/custom_place_name:label">Masukkan nama tempat ini</span><span lang="ne" class="question-label " data-itext-id="/data/init/custom_place_name:label">यस स्थानको नाम लेख्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/init/custom_place_name:label">Jaza jina la eneo hii</span><span class="required">*</span><input type="text" name="/data/init/custom_place_name" data-required="true()" data-relevant="selected( /data/init/create_new_person ,'none') or selected( /data/health_center/is_name_generated , 'false') or selected( /data/health_center/is_name_generated , 'no')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/health_center/external_id:label">External ID</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/external_id:label">Identifiant externe</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/external_id:label">बाहरी ID</span><span lang="id" class="question-label " data-itext-id="/data/health_center/external_id:label">Eksternal ID</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/external_id:label">बाहिरि ID</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/external_id:label">Namba ya nje</span><input type="text" name="/data/health_center/external_id" data-type-xml="string"></label><fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/use_cases:label">Health programs</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/use_cases:label">Programmes de santé</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/use_cases:label">स्वास्थ्य कार्यक्रम</span><span lang="id" class="question-label " data-itext-id="/data/health_center/use_cases:label">Program Kesehatan</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/use_cases:label">स्वास्थ्य कार्यक्रम</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/use_cases:label">Huduma za afya</span><span lang="en" class="or-hint active" data-itext-id="/data/health_center/use_cases:hint">Select all needed for this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Sélectionnez tout ce dont vous avez besoin pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">इस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> के लिए आवश्यक सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Pilih semua yang diperlukan untuk ini <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="ne" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">यस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> का लागि आवश्यक सब छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/health_center/use_cases:hint">Chagua zote zinazohitajika kwa hii <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/data/health_center/use_cases" value="anc" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/anc:label">Antenatal care</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Soins prénataux</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">गर्भावस्था की देखभाल</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Perawatan Antenatal</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">पूर्व प्रसुती स्याहार</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/anc:label">Huduma ya kabla ya kuzaa</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="pnc" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/pnc:label">Postnatal care</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Soins postnataux</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">गर्भावस्था के बाद की देखभाल</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Perawatan Setelah Melahirkan</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">प्रसुती पश्चातको स्याहार</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/pnc:label">Huduma ya baada ya kuzaa</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="imm" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/imm:label">Immunizations</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Vaccination</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">टीकाकरण</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Imunisasi</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">खोप</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/imm:label">Chanjo</span></label><label class=""><input type="checkbox" name="/data/health_center/use_cases" value="gmp" data-relevant="../type = 'health_center'" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/use_cases/gmp:label">Growth monitoring (nutrition)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Surveillance de la croissance</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">विकास की निगरानी</span><span lang="id" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Pemantauan Pertumbuhan</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">विकास अनुगमन</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/use_cases/gmp:label">Ufuatiliaji wa Ukuaji</span></label>
</div>
</fieldset></fieldset>
<fieldset class="question simple-select or-branch pre-init "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/health_center/vaccines:label">Select vaccines</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/vaccines:label">Choisissez les vaccins</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/vaccines:label">टीकाकरण चुनें</span><span lang="id" class="question-label " data-itext-id="/data/health_center/vaccines:label">Pilih Jenis Vaksin</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/vaccines:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/vaccines:label">-</span><span lang="en" class="or-hint active" data-itext-id="/data/health_center/vaccines:hint">Select all needed for this <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="fr" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Sélectionnez tout ce dont vous avez besoin pour <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="hi" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">इस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> के लिए आवश्यक सभी का चयन करें</span><span lang="id" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Pilih semua yang diperlukan untuk ini <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span><span lang="ne" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">यस <span class="or-output" data-value=" /data/init/place_type_translation "> </span> का लागि आवश्यक सब छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/health_center/vaccines:hint">Chagua zote zinazohitajika kwa hii <span class="or-output" data-value=" /data/init/place_type_translation "> </span></span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="checkbox" name="/data/health_center/vaccines" value="bcg" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">BCG</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/bcg:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="cholera" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/cholera:label">Cholera</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Choléra</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Cholera</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">Kolera</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/cholera:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hep_a" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hépatite A</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">Hepatitis A</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hep_a:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hep_b" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">Hepatitis B</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hep_b:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="hpv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (virus du papillome humain)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">HPV (Human Papillomavirus)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/hpv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="flu" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Grippe</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">Influenza</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/flu:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="jap_enc" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Encéphalite japonaise</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">Japanese Encephalitis</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/jap_enc:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="meningococcal" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Méningocoque</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">Meningococcal</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/meningococcal:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="mmr" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (rougeole, oreillons, rubéole)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">MMR (Measles, Mumps, Rubella)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/mmr:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="mmrv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (rougeole, oreillons, rubéole, varicelle)</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">MMRV (Measles, Mumps, Rubella, Varicella)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/mmrv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="ipv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Polio inactivée</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">Inactivated Polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/ipv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="fipv" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">Fractional inactivated polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/fipv:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="polio" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Polio</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">Oral Polio</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/polio:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="penta" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Penta</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">Pentavalent</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/penta:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="pneumococcal" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumo</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">Pneumococcal Pneumonia</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/pneumococcal:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="rotavirus" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rota</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">Rotavirus</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/rotavirus:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="typhoid" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoïde</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">Typhoid</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/typhoid:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="vitamin_a" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamine A</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">Vitamin A</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/vitamin_a:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="yellow_fever" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Fièvre jaune</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">Yellow Fever</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/yellow_fever:label">-</span></label><label class=""><input type="checkbox" name="/data/health_center/vaccines" value="dpt" data-relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="fr" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span><span lang="hi" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="id" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">Diptheria, Pertussis, and Tetanus (DPT)</span><span lang="ne" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span><span lang="sw" class="option-label " data-itext-id="/data/health_center/vaccines/dpt:label">-</span></label>
</div>
</fieldset></fieldset>
<label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/data/health_center/notes:label">Notes</span><span lang="fr" class="question-label " data-itext-id="/data/health_center/notes:label">Notes</span><span lang="hi" class="question-label " data-itext-id="/data/health_center/notes:label">नोट्स</span><span lang="id" class="question-label " data-itext-id="/data/health_center/notes:label">Catatan</span><span lang="ne" class="question-label " data-itext-id="/data/health_center/notes:label">टिप्पणि</span><span lang="sw" class="question-label " data-itext-id="/data/health_center/notes:label">Maelezo</span><textarea name="/data/health_center/notes" data-type-xml="string"></textarea></label><section class="or-group-data or-appearance-hidden " name="/data/health_center/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/data/init/contact_name" data-calculate="coalesce(../name, ../../contact/name)" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/init/place_type_translation" data-calculate="jr:choice-name( /data/init/place_type ,' /data/init/place_type ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/init/generated_name_translation" data-calculate="jr:choice-name( /data/init/generated_name ,' /data/init/generated_name ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/contact/meta/created_by" data-calculate="../../../inputs/user/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/contact/meta/created_by_person_uuid" data-calculate="../../../inputs/user/contact_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/contact/meta/created_by_place_uuid" data-calculate="../../../inputs/user/facility_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/name" data-calculate="if( ( selected( /data/health_center/is_name_generated , 'true') or selected( /data/health_center/is_name_generated , 'yes') ),  /data/init/generated_name_translation ,  /data/init/custom_place_name )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/contact" data-calculate="if(selected( /data/init/create_new_person ,'none'), &quot;&quot;, coalesce( /data/init/select_person ,&quot;NEW&quot;))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/geolocation" data-calculate="concat(../../inputs/meta/location/lat, concat(' ', ../../inputs/meta/location/long))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/created_by" data-calculate="../../../inputs/user/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/created_by_person_uuid" data-calculate="../../../inputs/user/contact_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/health_center/meta/created_by_place_uuid" data-calculate="../../../inputs/user/facility_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <data xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" delimiter="#" id="contact:health_center:create" prefix="J1!contact:health_center:create!" version="2019-03-03_08-22">
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
            <parent>PARENT</parent>
            <type/>
            <is_name_generated>true</is_name_generated>
            <name/>
            <external_id/>
            <use_cases/>
            <vaccines/>
            <notes/>
            <contact/>
            <geolocation/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </health_center>
          <init>
            <create_new_person/>
            <select_person/>
            <name/>
            <contact_name/>
            <custom_place_name/>
            <place_type>health_center</place_type>
            <place_type_translation/>
            <generated_name>health_center</generated_name>
            <generated_name_translation/>
          </init>
          <contact>
            <parent>PARENT</parent>
            <type>person</type>
            <name/>
            <phone/>
            <phone_alternate/>
            <role/>
            <role_other/>
            <external_id/>
            <notes/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </contact>
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
    <h:title>New Health Center</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/data/contact/external_id:label">
            <value>External ID</value>
          </text>
          <text id="/data/contact/name:label">
            <value>Names</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>Alternate Phone Number</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>CHW</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>CHW Supervisor</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>Facility Manager</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>Nurse</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>Other</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>Patient</value>
          </text>
          <text id="/data/contact/role:label">
            <value>Role</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>Specify other</value>
          </text>
          <text id="/data/contact:label">
            <value>New Person</value>
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
            <value>Would you like to name the place after the primary contact: &quot;<output value=" /data/init/generated_name_translation "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Name</value>
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
          <text id="/data/init/create_new_person/new_person:label">
            <value>Create a new person</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>Skip this step</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>Select an existing person</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>Set the Primary Contact</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>Name of this <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value><output value=" /data/init/contact_name "/>'s Area</value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value><output value=" /data/init/contact_name "/>'s District</value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value><output value=" /data/init/contact_name "/>'s Health Center</value>
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
          <text id="/data/init/place_type:label">
            <value>Enter the name of this place</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>Select the Primary Contact</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/data/contact/external_id:label">
            <value>Identifiant externe</value>
          </text>
          <text id="/data/contact/meta:label">
            <value>-</value>
          </text>
          <text id="/data/contact/name:label">
            <value>Nom</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>Téléphone</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>Téléphone alternatif</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>ASC</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>Superviseur ASC</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>Staff médical</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>Infirmier</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>Autre</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>Patient</value>
          </text>
          <text id="/data/contact/role:label">
            <value>Rôle</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>Specifier</value>
          </text>
          <text id="/data/contact:label">
            <value>Nouvelle personne</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>Identifiant externe</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>Non, je veux nommer ça manuellement</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>Oui</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>Voulez-vous nommer l'endroit: &quot;<output value=" /data/init/generated_name_translation "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Nom</value>
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
            <value>Programmes de santé</value>
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
            <value>Choisissez les vaccins</value>
          </text>
          <text id="/data/init/create_new_person/new_person:label">
            <value>Créer une nouvelle personne</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>Sauter cette section</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>Selectiionner une personne existant</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>Contact primaire</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>Nom pour <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value>Zone de <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value>District de <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value>Centre de santé de <output value=" /data/init/contact_name "/></value>
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
          <text id="/data/init/place_type:label">
            <value>Nom de l'endroit</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>Choisisser le contact primaire</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/data/contact/external_id:label">
            <value>बाहरी ID</value>
          </text>
          <text id="/data/contact/meta:label">
            <value>-</value>
          </text>
          <text id="/data/contact/name:label">
            <value>नाम</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>नोट्स</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>फोन नंबर</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>अन्य फोन नंबर</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>सामुदायिक स्वास्थ्य कर्मी</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>सामुदायिक स्वास्थ्य कर्मी के मैनेजर</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>स्वास्थ्य केंद्र के मैनजर</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>नर्स</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>अन्य</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>मरीज़</value>
          </text>
          <text id="/data/contact/role:label">
            <value>भूमिका</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>अन्य का उल्‍लेख करें</value>
          </text>
          <text id="/data/contact:label">
            <value>नया व्यक्ति</value>
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
            <value>क्या आप इस स्थान को प्राथमिक कॉंटॅक्ट का नाम देना चाहेंगे?: <output value=" /data/init/generated_name_translation "/></value>
          </text>
          <text id="/data/health_center/name:label">
            <value>नाम</value>
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
          <text id="/data/init/create_new_person/new_person:label">
            <value>एक नया व्यक्ति बनाएं</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>इस स्टेप को छोड़ दें</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>मौजूदा व्यक्ति चुनें</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>प्राथमिक कॉंटॅक्ट चुनें</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>इस स्थान का नाम <output value=" /data/init/place_type_translation "/></value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value><output value=" /data/init/contact_name "/> का क्षेत्र</value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value><output value=" /data/init/contact_name "/> का ज़िला</value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value><output value=" /data/init/contact_name "/> का स्वास्थ्य केंद्र</value>
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
          <text id="/data/init/place_type:label">
            <value>इस स्थान का नाम दर्ज करें</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>प्राथमिक कॉंटॅक्ट चुनें</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/data/contact/external_id:label">
            <value>Eksternal ID</value>
          </text>
          <text id="/data/contact/meta:label">
            <value>-</value>
          </text>
          <text id="/data/contact/name:label">
            <value>Nama</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>Catatan</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>Nomor Telepon</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>Nomor Telepon Alternatif</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>Kader</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>Kader Pengawas</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>Manajer Fasilitas</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>Perawat</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>Lain</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>Pasien</value>
          </text>
          <text id="/data/contact/role:label">
            <value>Peran</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>Tentukan lainnya</value>
          </text>
          <text id="/data/contact:label">
            <value>Orang Baru</value>
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
            <value>Apakah Anda ingin nama tempat setelah kontak utama: &quot;<output value=" /data/init/generated_name_translation "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Nama</value>
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
          <text id="/data/init/create_new_person/new_person:label">
            <value>Buat orang baru</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>Lewati langkah ini</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>Pilih orang yang ada</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>Ditetapkan Sebagai Kontak Utama</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>Masukkan nama tempat ini</value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value>Daerah <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value>Kabupaten <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value>Fasilitas Kesehatan <output value=" /data/init/contact_name "/></value>
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
          <text id="/data/init/place_type:label">
            <value>Masukkan nama tempat ini</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>Pilih Kontak Utama</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/data/contact/external_id:label">
            <value>बाहिरि ID</value>
          </text>
          <text id="/data/contact/meta:label">
            <value>-</value>
          </text>
          <text id="/data/contact/name:label">
            <value>नाम</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>टिप्पणि</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>फाेन नम्बर</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>बैकल्पिक फाेन नम्बर</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>महिला स्वास्थ्य स्वयम् सेविका</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>महिला स्वास्थ्य स्वयम् सेविकाको सुपरभाइजर</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>स्वास्थ्य सस्था प्रमुख</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>नर्स</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>अन्य</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>बिरामी</value>
          </text>
          <text id="/data/contact/role:label">
            <value>भुमिका</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>अन्य उल्लेख गर्नुहोस्</value>
          </text>
          <text id="/data/contact:label">
            <value>नया व्यक्ति</value>
          </text>
          <text id="/data/health_center/external_id:label">
            <value>बाहिरि ID</value>
          </text>
          <text id="/data/health_center/is_name_generated/false:label">
            <value>होइन, म आफैँ नाम दिन चाहन्छु</value>
          </text>
          <text id="/data/health_center/is_name_generated/true:label">
            <value>हो</value>
          </text>
          <text id="/data/health_center/is_name_generated:label">
            <value>के तपाइ यस स्थानकाे प्राथमिक सम्पर्क नाम दिन चाहानु हुन्छ?:<output value=" /data/init/generated_name_translation "/></value>
          </text>
          <text id="/data/health_center/name:label">
            <value>नाम</value>
          </text>
          <text id="/data/health_center/notes:label">
            <value>टिप्पणि</value>
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
          <text id="/data/init/create_new_person/new_person:label">
            <value>एक नया व्यक्ति बनाउनुस</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>एख</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>व्यक्ति छान्नुहोस्</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>प्राथमिक सम्पर्क व्यक्ति</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>यस स्थानको नाम लेख्नुहोस्</value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value><output value=" /data/init/contact_name "/>को क्षेत्र</value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value><output value=" /data/init/contact_name "/>को जिल्ला</value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value><output value=" /data/init/contact_name "/>को स्वास्थ्य केन्द्र</value>
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
          <text id="/data/init/place_type:label">
            <value>यस स्थानको नाम लेख्नुहोस्</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>प्राथमिक सम्पर्क व्यक्ति छान्नुहोस्</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/data/contact/external_id:label">
            <value>Kitambulisho cha nje</value>
          </text>
          <text id="/data/contact/meta:label">
            <value>-</value>
          </text>
          <text id="/data/contact/name:label">
            <value>Jina</value>
          </text>
          <text id="/data/contact/notes:label">
            <value>Maelezo</value>
          </text>
          <text id="/data/contact/phone:label">
            <value>Namba ya Simi</value>
          </text>
          <text id="/data/contact/phone_alternate:label">
            <value>Namba Ya</value>
          </text>
          <text id="/data/contact/role/chw:label">
            <value>Mhudumu wa afya</value>
          </text>
          <text id="/data/contact/role/chw_supervisor:label">
            <value>Mkuu wa wahudumu wa afya</value>
          </text>
          <text id="/data/contact/role/manager:label">
            <value>Meneja wa Kituo cha afya</value>
          </text>
          <text id="/data/contact/role/nurse:label">
            <value>Muuguzi</value>
          </text>
          <text id="/data/contact/role/other:label">
            <value>Nyingine</value>
          </text>
          <text id="/data/contact/role/patient:label">
            <value>Mgonjwa</value>
          </text>
          <text id="/data/contact/role:label">
            <value>Namba ya simu Nyingine</value>
          </text>
          <text id="/data/contact/role_other:label">
            <value>Fafanua vingine</value>
          </text>
          <text id="/data/contact:label">
            <value>Mtu Mpya</value>
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
            <value>Je, Ungependa kuita eneo hii kama mwasilishi mkuu wa eneo hii? &quot;<output value=" /data/init/generated_name_translation "/>&quot;?</value>
          </text>
          <text id="/data/health_center/name:label">
            <value>Jina</value>
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
          <text id="/data/init/create_new_person/new_person:label">
            <value>Ongeza mtumizi mpya</value>
          </text>
          <text id="/data/init/create_new_person/none:label">
            <value>Ruka hatua ii</value>
          </text>
          <text id="/data/init/create_new_person/old_person:label">
            <value>Chagua mtumizi aliyesajlishwa apo awali</value>
          </text>
          <text id="/data/init/create_new_person:label">
            <value>Weka mwasiliwa mkuu</value>
          </text>
          <text id="/data/init/custom_place_name:label">
            <value>Jaza jina la eneo hii</value>
          </text>
          <text id="/data/init/generated_name/clinic:label">
            <value>Eneo ya  <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/district_hospital:label">
            <value>WIlaya ya  <output value=" /data/init/contact_name "/></value>
          </text>
          <text id="/data/init/generated_name/health_center:label">
            <value>Kituo cha afya cha  <output value=" /data/init/contact_name "/></value>
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
          <text id="/data/init/place_type:label">
            <value>Jaza jina la eneo hii</value>
          </text>
          <text id="/data/init/select_person:label">
            <value>Chagua Mwasiliwa mkuu</value>
          </text>
        </translation>
      </itext>
      <instance>
        <data delimiter="#" id="contact:health_center:create" prefix="J1!contact:health_center:create!" version="2019-03-03_08-22">
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
            <parent>PARENT</parent>
            <type/>
            <is_name_generated>true</is_name_generated>
            <name/>
            <external_id/>
            <use_cases/>
            <vaccines/>
            <notes/>
            <contact/>
            <geolocation/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </health_center>
          <init>
            <create_new_person/>
            <select_person/>
            <name/>
            <contact_name/>
            <custom_place_name/>
            <place_type>health_center</place_type>
            <place_type_translation/>
            <generated_name>health_center</generated_name>
            <generated_name_translation/>
          </init>
          <contact>
            <parent>PARENT</parent>
            <type>person</type>
            <name/>
            <phone/>
            <phone_alternate/>
            <role/>
            <role_other/>
            <external_id/>
            <notes/>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </contact>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </data>
      </instance>
      <bind nodeset="/data/inputs" relevant="false()"/>
      <bind nodeset="/data/inputs/user/contact_id" type="string"/>
      <bind nodeset="/data/inputs/user/facility_id" type="string"/>
      <bind nodeset="/data/inputs/user/name" type="string"/>
      <bind nodeset="/data/init/create_new_person" required="true()" type="select1"/>
      <bind nodeset="/data/init/select_person" relevant="selected( /data/init/create_new_person ,'old_person')" required="true()" type="db:person"/>
      <bind nodeset="/data/init/name" type="string"/>
      <bind calculate="coalesce(../name, ../../contact/name)" nodeset="/data/init/contact_name" type="string"/>
      <bind nodeset="/data/init/custom_place_name" relevant="selected( /data/init/create_new_person ,'none') or selected( /data/health_center/is_name_generated , 'false') or selected( /data/health_center/is_name_generated , 'no')" required="true()" type="string"/>
      <bind nodeset="/data/init/place_type" type="select1"/>
      <bind calculate="jr:choice-name( /data/init/place_type ,' /data/init/place_type ')" nodeset="/data/init/place_type_translation" type="string"/>
      <bind nodeset="/data/init/generated_name" type="select1"/>
      <bind calculate="jr:choice-name( /data/init/generated_name ,' /data/init/generated_name ')" nodeset="/data/init/generated_name_translation" type="string"/>
      <bind nodeset="/data/contact" relevant="selected( /data/init/create_new_person ,'new_person')"/>
      <bind nodeset="/data/contact/parent" type="string"/>
      <bind nodeset="/data/contact/type" type="string"/>
      <bind nodeset="/data/contact/name" required="true()" type="string"/>
      <bind constraint="true()" jr:constraintMsg="Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678" nodeset="/data/contact/phone" type="tel"/>
      <bind constraint="true()" jr:constraintMsg="Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678" nodeset="/data/contact/phone_alternate" type="tel"/>
      <bind nodeset="/data/contact/role" type="select1"/>
      <bind nodeset="/data/contact/role_other" relevant="selected(  /data/contact/role ,'other')" required="true()" type="string"/>
      <bind nodeset="/data/contact/external_id" type="string"/>
      <bind nodeset="/data/contact/notes" type="string"/>
      <bind calculate="../../../inputs/user/name" nodeset="/data/contact/meta/created_by" type="string"/>
      <bind calculate="../../../inputs/user/contact_id" nodeset="/data/contact/meta/created_by_person_uuid" type="string"/>
      <bind calculate="../../../inputs/user/facility_id" nodeset="/data/contact/meta/created_by_place_uuid" type="string"/>
      <bind nodeset="/data/health_center/parent" type="string"/>
      <bind nodeset="/data/health_center/type" type="string"/>
      <bind nodeset="/data/health_center/is_name_generated" relevant="not(selected( /data/init/create_new_person ,'none'))" required="true()" type="select1"/>
      <bind calculate="if( ( selected( /data/health_center/is_name_generated , 'true') or selected( /data/health_center/is_name_generated , 'yes') ),  /data/init/generated_name_translation ,  /data/init/custom_place_name )" nodeset="/data/health_center/name" required="true()" type="string"/>
      <bind nodeset="/data/health_center/external_id" type="string"/>
      <bind nodeset="/data/health_center/use_cases" relevant="../type = 'health_center'" type="select"/>
      <bind nodeset="/data/health_center/vaccines" relevant="../type = 'health_center' and selected( /data/health_center/use_cases ,'imm')" type="select"/>
      <bind nodeset="/data/health_center/notes" type="string"/>
      <bind calculate="if(selected( /data/init/create_new_person ,'none'), &quot;&quot;, coalesce( /data/init/select_person ,&quot;NEW&quot;))" nodeset="/data/health_center/contact" type="string"/>
      <bind calculate="concat(../../inputs/meta/location/lat, concat(' ', ../../inputs/meta/location/long))" nodeset="/data/health_center/geolocation" type="string"/>
      <bind calculate="../../../inputs/user/name" nodeset="/data/health_center/meta/created_by" type="string"/>
      <bind calculate="../../../inputs/user/contact_id" nodeset="/data/health_center/meta/created_by_person_uuid" type="string"/>
      <bind calculate="../../../inputs/user/facility_id" nodeset="/data/health_center/meta/created_by_place_uuid" type="string"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/data/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group ref="/data/inputs">
      <group ref="/data/inputs/user">
        <input ref="/data/inputs/user/contact_id"/>
        <input ref="/data/inputs/user/facility_id"/>
        <input ref="/data/inputs/user/name"/>
      </group>
    </group>
    <group appearance="field-list" ref="/data/init">
      <select1 ref="/data/init/create_new_person">
        <label ref="jr:itext('/data/init/create_new_person:label')"/>
        <item>
          <label ref="jr:itext('/data/init/create_new_person/new_person:label')"/>
          <value>new_person</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/create_new_person/old_person:label')"/>
          <value>old_person</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/create_new_person/none:label')"/>
          <value>none</value>
        </item>
      </select1>
      <input appearance="db-object" ref="/data/init/select_person">
        <label ref="jr:itext('/data/init/select_person:label')"/>
      </input>
      <input appearance="hidden" ref="/data/init/name"/>
      <select1 appearance="hidden" ref="/data/init/place_type">
        <label ref="jr:itext('/data/init/place_type:label')"/>
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
      <select1 appearance="hidden" ref="/data/init/generated_name">
        <item>
          <label ref="jr:itext('/data/init/generated_name/district_hospital:label')"/>
          <value>district_hospital</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/generated_name/health_center:label')"/>
          <value>health_center</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/generated_name/clinic:label')"/>
          <value>clinic</value>
        </item>
      </select1>
      <group appearance="field-list" ref="/data/contact">
        <label ref="jr:itext('/data/contact:label')"/>
        <input ref="/data/contact/name">
          <label ref="jr:itext('/data/contact/name:label')"/>
        </input>
        <input ref="/data/contact/phone">
          <label ref="jr:itext('/data/contact/phone:label')"/>
        </input>
        <input ref="/data/contact/phone_alternate">
          <label ref="jr:itext('/data/contact/phone_alternate:label')"/>
        </input>
        <select1 ref="/data/contact/role">
          <label ref="jr:itext('/data/contact/role:label')"/>
          <item>
            <label ref="jr:itext('/data/contact/role/chw:label')"/>
            <value>chw</value>
          </item>
          <item>
            <label ref="jr:itext('/data/contact/role/chw_supervisor:label')"/>
            <value>chw_supervisor</value>
          </item>
          <item>
            <label ref="jr:itext('/data/contact/role/nurse:label')"/>
            <value>nurse</value>
          </item>
          <item>
            <label ref="jr:itext('/data/contact/role/manager:label')"/>
            <value>manager</value>
          </item>
          <item>
            <label ref="jr:itext('/data/contact/role/patient:label')"/>
            <value>patient</value>
          </item>
          <item>
            <label ref="jr:itext('/data/contact/role/other:label')"/>
            <value>other</value>
          </item>
        </select1>
        <input ref="/data/contact/role_other">
          <label ref="jr:itext('/data/contact/role_other:label')"/>
        </input>
        <input ref="/data/contact/external_id">
          <label ref="jr:itext('/data/contact/external_id:label')"/>
        </input>
        <input appearance="multiline" ref="/data/contact/notes">
          <label ref="jr:itext('/data/contact/notes:label')"/>
        </input>
        <group appearance="hidden" ref="/data/contact/meta"/>
        </group>
      </group>
    <group appearance="field-list" ref="/data/health_center">
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
      <input ref="/data/init/custom_place_name">
        <label ref="jr:itext('/data/init/custom_place_name:label')"/>
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
  </h:body>
</h:html>
`,   
};
