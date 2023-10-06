/* eslint-disable max-len */
/* eslint-disable-next-line no-undef */
formData = {
  formHtml: `<form autocomplete="off" novalidate="novalidate" class="or clearfix" dir="ltr" data-form-id="contact:person:create">
<section class="form-logo"></section><h3 dir="auto" id="form-title">New Person</h3>
<select id="form-languages" data-default-lang=""><option value="en">en</option> <option value="fr">fr</option> <option value="hi">hi</option> <option value="id">id</option> <option value="ne">ne</option> <option value="sw">sw</option> </select>
  
  
    <section class="or-group-data or-branch pre-init " name="/data/inputs" data-relevant="false()"><section class="or-group-data " name="/data/inputs/user"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/inputs/user/contact_id:label">Contact ID of the logged in user</span><span lang="fr" class="question-label " data-itext-id="/data/inputs/user/contact_id:label">Identifiant du contact</span><span lang="hi" class="question-label " data-itext-id="/data/inputs/user/contact_id:label">Contact ID of the logged in user</span><span lang="id" class="question-label " data-itext-id="/data/inputs/user/contact_id:label">Contact ID of the logged in user</span><span lang="ne" class="question-label " data-itext-id="/data/inputs/user/contact_id:label">लग इन गरेको प्रयोगकर्ताको सम्पर्क ID</span><span lang="sw" class="question-label " data-itext-id="/data/inputs/user/contact_id:label">Namba ya Usajilisho ya mtumiaji wa huduma hii</span><input type="text" name="/data/inputs/user/contact_id" data-type-xml="string"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/inputs/user/facility_id:label">Place ID of the logged in user</span><span lang="fr" class="question-label " data-itext-id="/data/inputs/user/facility_id:label">Identifiant du centre</span><span lang="hi" class="question-label " data-itext-id="/data/inputs/user/facility_id:label">लॉग इन यूज़र के स्थान का ID</span><span lang="id" class="question-label " data-itext-id="/data/inputs/user/facility_id:label">ID Tempat dari login user</span><span lang="ne" class="question-label " data-itext-id="/data/inputs/user/facility_id:label">लग इन गरेको प्रयोगकर्ताको स्थानको ID</span><span lang="sw" class="question-label " data-itext-id="/data/inputs/user/facility_id:label">Kitambulisho cha mahali cha mtumizi wa huduma hii</span><input type="text" name="/data/inputs/user/facility_id" data-type-xml="string"></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/inputs/user/name:label">Name of the logged in user</span><span lang="fr" class="question-label " data-itext-id="/data/inputs/user/name:label">Nom</span><span lang="hi" class="question-label " data-itext-id="/data/inputs/user/name:label">लॉग इन यूज़र का नाम</span><span lang="id" class="question-label " data-itext-id="/data/inputs/user/name:label">Nama dari login user</span><span lang="ne" class="question-label " data-itext-id="/data/inputs/user/name:label">लग इन गरेको प्रयोगकर्ताको नाम</span><span lang="sw" class="question-label " data-itext-id="/data/inputs/user/name:label">Jina ya mtumizi</span><input type="text" name="/data/inputs/user/name" data-type-xml="string"></label>
      </section>
      </section>
    <section class="or-group-data " name="/data/init"><label class="question non-select or-appearance-db-object "><span lang="en" class="question-label active" data-itext-id="/data/init/parent_id:label">Belongs To</span><span lang="fr" class="question-label " data-itext-id="/data/init/parent_id:label">Associé avec</span><span lang="hi" class="question-label " data-itext-id="/data/init/parent_id:label">यह व्यक्ति इस जगह से जुड़ा है</span><span lang="id" class="question-label " data-itext-id="/data/init/parent_id:label">Orang ini terhubung ke tempat ini</span><span lang="ne" class="question-label " data-itext-id="/data/init/parent_id:label">यो व्यक्ति यस ठाउँसँग सम्बन्धित छ</span><span lang="sw" class="question-label " data-itext-id="/data/init/parent_id:label">Ni wa</span><span lang="en" class="or-hint active" data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><span lang="fr" class="or-hint " data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><span lang="hi" class="or-hint " data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><span lang="id" class="or-hint " data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><span lang="ne" class="or-hint " data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><span lang="sw" class="or-hint " data-itext-id="/data/init/parent_id:hint"> <span class="or-output" data-value=" /data/init/type_label "> </span></span><input type="text" name="/data/init/parent_id" data-calculate=" /data/person/parent " data-type-xml="string" readonly></label><label class="question non-select or-appearance-hidden "><input type="text" name="/data/init/name" data-type-xml="string"></label><label class="question non-select or-appearance-hidden "><input type="text" name="/data/init/type" data-type-xml="string"></label><fieldset class="question simple-select or-appearance-hidden "><fieldset>
<legend>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/init/type_selector" data-name="/data/init/type_selector" value="district_hospital" data-calculate="../type" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/type_selector/district_hospital:label">Health Facility</span><span lang="fr" class="option-label " data-itext-id="/data/init/type_selector/district_hospital:label">Hôpital de District</span><span lang="hi" class="option-label " data-itext-id="/data/init/type_selector/district_hospital:label">ज़िला</span><span lang="id" class="option-label " data-itext-id="/data/init/type_selector/district_hospital:label">Kabupaten</span><span lang="ne" class="option-label " data-itext-id="/data/init/type_selector/district_hospital:label">जिल्ला</span><span lang="sw" class="option-label " data-itext-id="/data/init/type_selector/district_hospital:label">Wilaya</span></label><label class=""><input type="radio" name="/data/init/type_selector" data-name="/data/init/type_selector" value="health_center" data-calculate="../type" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/type_selector/health_center:label">Area</span><span lang="fr" class="option-label " data-itext-id="/data/init/type_selector/health_center:label">Centre de center</span><span lang="hi" class="option-label " data-itext-id="/data/init/type_selector/health_center:label">स्वास्थ्य केंद्र</span><span lang="id" class="option-label " data-itext-id="/data/init/type_selector/health_center:label">Fasilitas Kesehatan</span><span lang="ne" class="option-label " data-itext-id="/data/init/type_selector/health_center:label">स्वास्थ्य के���्द्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/type_selector/health_center:label">Kituo cha afya</span></label><label class=""><input type="radio" name="/data/init/type_selector" data-name="/data/init/type_selector" value="clinic" data-calculate="../type" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/init/type_selector/clinic:label">Household</span><span lang="fr" class="option-label " data-itext-id="/data/init/type_selector/clinic:label">Zone</span><span lang="hi" class="option-label " data-itext-id="/data/init/type_selector/clinic:label">क्षेत्र</span><span lang="id" class="option-label " data-itext-id="/data/init/type_selector/clinic:label">Daerah</span><span lang="ne" class="option-label " data-itext-id="/data/init/type_selector/clinic:label">क्षेत्र</span><span lang="sw" class="option-label " data-itext-id="/data/init/type_selector/clinic:label">Eneo</span></label>
</div>
</fieldset></fieldset>
      </section>
    <section class="or-group-data " name="/data/person"><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/name:label">Full name</span><span lang="fr" class="question-label " data-itext-id="/data/person/name:label">Nom</span><span lang="hi" class="question-label " data-itext-id="/data/person/name:label">नाम</span><span lang="id" class="question-label " data-itext-id="/data/person/name:label">Nama</span><span lang="ne" class="question-label " data-itext-id="/data/person/name:label">नाम</span><span lang="sw" class="question-label " data-itext-id="/data/person/name:label">Majina</span><span class="required">*</span><input type="text" name="/data/person/name" data-required="true()" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/short_name:label">Short name</span><span lang="fr" class="question-label " data-itext-id="/data/person/short_name:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/short_name:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/short_name:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/short_name:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/short_name:label">-</span><span lang="en" class="or-hint active" data-itext-id="/data/person/short_name:hint">Please enter a short name that is preferred by the person.</span><span lang="fr" class="or-hint " data-itext-id="/data/person/short_name:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/data/person/short_name:hint">-</span><span lang="id" class="or-hint " data-itext-id="/data/person/short_name:hint">-</span><span lang="ne" class="or-hint " data-itext-id="/data/person/short_name:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/data/person/short_name:hint">-</span><input type="text" name="/data/person/short_name" data-constraint="string-length(.) &lt;= 10" data-type-xml="string"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/short_name:jr:constraintMsg">Short name can not be more than 10 characters long.</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/short_name:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/short_name:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/short_name:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/short_name:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/short_name:jr:constraintMsg">-</span></label><section class="or-group-data " name="/data/person/ephemeral_dob"><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">Age</span><span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_calendar:label">-</span><span class="required">*</span><span lang="en" class="or-hint active" data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">Date of Birth</span><span lang="fr" class="or-hint " data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">-</span><span lang="hi" class="or-hint " data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">-</span><span lang="id" class="or-hint " data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">-</span><span lang="ne" class="or-hint " data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">-</span><span lang="sw" class="or-hint " data-itext-id="/data/person/ephemeral_dob/dob_calendar:hint">-</span><input type="date" name="/data/person/ephemeral_dob/dob_calendar" data-required="true()" data-constraint=". &lt;= now()" data-relevant="not(selected(../dob_method,'approx'))" data-type-xml="date"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">Date must be before today</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/ephemeral_dob/age_label:label"><strong>Please enter date of birth</strong></span><span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_label:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_label:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_label:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_label:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_label:label">-</span><input type="text" name="/data/person/ephemeral_dob/age_label" data-relevant="selected(../dob_method,'approx')" data-type-xml="string" readonly></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/ephemeral_dob/age_years:label">Years</span><span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_years:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_years:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_years:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_years:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_years:label">-</span><span class="required">*</span><input type="number" name="/data/person/ephemeral_dob/age_years" data-required="true()" data-constraint=". &gt;= 0 and . &lt;= 130" data-relevant="selected(../dob_method,'approx')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">Age must be between 0 and 130</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">-</span><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/ephemeral_dob/age_months:label">Months</span><span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_months:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_months:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_months:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_months:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/age_months:label">-</span><input type="number" name="/data/person/ephemeral_dob/age_months" data-constraint=". &gt;= 0 and . &lt;= 11" data-relevant="selected(../dob_method,'approx')" data-type-xml="int"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">Months must between 0 and 11</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">-</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">-</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">-</span></label><fieldset class="question simple-select or-appearance-columns "><fieldset>
<legend>
<span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_method:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_method:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_method:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_method:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_method:label">-</span>
          </legend>
<div class="option-wrapper"><label class=""><input type="checkbox" name="/data/person/ephemeral_dob/dob_method" value="approx" data-type-xml="select"><span lang="en" class="option-label active" data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">Date of birth unknown</span><span lang="fr" class="option-label " data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">Date de naissance inconnue</span><span lang="hi" class="option-label " data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">जन्म की तारीख का पता नहीं</span><span lang="id" class="option-label " data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">Tanggal tidak diketahui lahir</span><span lang="ne" class="option-label " data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">जन्म मिती थाहा नभएको</span><span lang="sw" class="option-label " data-itext-id="/data/person/ephemeral_dob/dob_method/approx:label">Tarehe ya Kuzaliwa</span></label></div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/ephemeral_dob/dob_debug:label">DOB Approx: <span class="or-output" data-value=" /data/person/ephemeral_dob/dob_approx "> </span><br>DOB Calendar: <span class="or-output" data-value=" /data/person/ephemeral_dob/dob_calendar "> </span><br>DOB ISO: <span class="or-output" data-value=" /data/person/ephemeral_dob/dob_iso "> </span></span><span lang="fr" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_debug:label">-</span><span lang="hi" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_debug:label">-</span><span lang="id" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_debug:label">-</span><span lang="ne" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_debug:label">-</span><span lang="sw" class="question-label " data-itext-id="/data/person/ephemeral_dob/dob_debug:label">-</span><input type="text" name="/data/person/ephemeral_dob/dob_debug" data-relevant="false()" data-type-xml="string" readonly></label>
      </section><fieldset class="question simple-select or-appearance-columns ">
<fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/person/sex:label">Sex</span><span lang="fr" class="question-label " data-itext-id="/data/person/sex:label">Sexe</span><span lang="hi" class="question-label " data-itext-id="/data/person/sex:label">लिंग</span><span lang="id" class="question-label " data-itext-id="/data/person/sex:label">Jenis kelamin</span><span lang="ne" class="question-label " data-itext-id="/data/person/sex:label">लिंग</span><span lang="sw" class="question-label " data-itext-id="/data/person/sex:label">Jinsia</span><span class="required">*</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/person/sex" data-name="/data/person/sex" value="female" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/sex/female:label">Female</span><span lang="fr" class="option-label " data-itext-id="/data/person/sex/female:label">Femme</span><span lang="hi" class="option-label " data-itext-id="/data/person/sex/female:label">स्त्री</span><span lang="id" class="option-label " data-itext-id="/data/person/sex/female:label">Wanita</span><span lang="ne" class="option-label " data-itext-id="/data/person/sex/female:label">महिला</span><span lang="sw" class="option-label " data-itext-id="/data/person/sex/female:label">Kike</span></label><label class=""><input type="radio" name="/data/person/sex" data-name="/data/person/sex" value="male" data-required="true()" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/sex/male:label">Male</span><span lang="fr" class="option-label " data-itext-id="/data/person/sex/male:label">Homme</span><span lang="hi" class="option-label " data-itext-id="/data/person/sex/male:label">पुरूष</span><span lang="id" class="option-label " data-itext-id="/data/person/sex/male:label">Pria</span><span lang="ne" class="option-label " data-itext-id="/data/person/sex/male:label">पुरुष</span><span lang="sw" class="option-label " data-itext-id="/data/person/sex/male:label">Kiume</span></label>
</div>
</fieldset>
<span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
</fieldset>
<label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/phone:label">Phone Number</span><span lang="fr" class="question-label " data-itext-id="/data/person/phone:label">Téléphone</span><span lang="hi" class="question-label " data-itext-id="/data/person/phone:label">फोन नंबर</span><span lang="id" class="question-label " data-itext-id="/data/person/phone:label">Nomor Telepon</span><span lang="ne" class="question-label " data-itext-id="/data/person/phone:label">फोन नम्बर</span><span lang="sw" class="question-label " data-itext-id="/data/person/phone:label">Nambari ya simu</span><input type="tel" name="/data/person/phone" data-constraint="true()" data-type-xml="tel"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/phone:jr:constraintMsg">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/phone:jr:constraintMsg">Veuillez entrer un numéro local valide ou utiliser le format international standard, qui comprend un signe plus (+) et le code du pays. Par exemple: +254712345678</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/phone:jr:constraintMsg">कृपया एक सही स्थानीय नंबर दर्ज करें, या मानक अंतरराष्ट्रीय प्रारूप का उपयोग करें, जिसमें एक प्लस साइन (+) और देश कोड शामिल है। उदाहरण के लिए: +914712345678</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/phone:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/phone:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/phone:jr:constraintMsg">-</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/phone_alternate:label">Alternate Phone Number</span><span lang="fr" class="question-label " data-itext-id="/data/person/phone_alternate:label">Téléphone alternatif</span><span lang="hi" class="question-label " data-itext-id="/data/person/phone_alternate:label">अन्य फोन नंबर</span><span lang="id" class="question-label " data-itext-id="/data/person/phone_alternate:label">Nomor Telepon Alternatif</span><span lang="ne" class="question-label " data-itext-id="/data/person/phone_alternate:label">अन्य फोन नम्बर</span><span lang="sw" class="question-label " data-itext-id="/data/person/phone_alternate:label">nambari nyingine ya simu</span><input type="tel" name="/data/person/phone_alternate" data-constraint="true()" data-type-xml="tel"><span lang="en" class="or-constraint-msg active" data-itext-id="/data/person/phone_alternate:jr:constraintMsg">Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</span><span lang="fr" class="or-constraint-msg " data-itext-id="/data/person/phone_alternate:jr:constraintMsg">Veuillez entrer un numéro local valide ou utiliser le format international standard, qui comprend un signe plus (+) et le code du pays. Par exemple: +254712345678</span><span lang="hi" class="or-constraint-msg " data-itext-id="/data/person/phone_alternate:jr:constraintMsg">कृपया एक सही स्थानीय नंबर दर्ज करें, या मानक अंतरराष्ट्रीय प्रारूप का उपयोग करें, जिसमें एक प्लस साइन (+) और देश कोड शामिल है। उदाहरण के लिए: +914712345678</span><span lang="id" class="or-constraint-msg " data-itext-id="/data/person/phone_alternate:jr:constraintMsg">-</span><span lang="ne" class="or-constraint-msg " data-itext-id="/data/person/phone_alternate:jr:constraintMsg">-</span><span lang="sw" class="or-constraint-msg " data-itext-id="/data/person/phone_alternate:jr:constraintMsg">-</span></label><fieldset class="question simple-select "><fieldset>
<legend>
<span lang="en" class="question-label active" data-itext-id="/data/person/role:label">Role</span><span lang="fr" class="question-label " data-itext-id="/data/person/role:label">Rôle</span><span lang="hi" class="question-label " data-itext-id="/data/person/role:label">भूमिका</span><span lang="id" class="question-label " data-itext-id="/data/person/role:label">Peran</span><span lang="ne" class="question-label " data-itext-id="/data/person/role:label">भूमिका</span><span lang="sw" class="question-label " data-itext-id="/data/person/role:label">Jukumu</span><span lang="en" class="or-hint active" data-itext-id="/data/person/role:hint">Select the role that best suits this person</span><span lang="fr" class="or-hint " data-itext-id="/data/person/role:hint">Sélectionnez le rôle qui convient le mieux à cette personne</span><span lang="hi" class="or-hint " data-itext-id="/data/person/role:hint">उस भूमिका का चयन करें जो इस व्यक्ति को सबसे अच्छा सूट करता है</span><span lang="id" class="or-hint " data-itext-id="/data/person/role:hint">Pilih peran yang paling cocok untuk orang ini</span><span lang="ne" class="or-hint " data-itext-id="/data/person/role:hint">यस व्यक्तिका लागि उपयुक्त भूमिका छान्नुहोस्</span><span lang="sw" class="or-hint " data-itext-id="/data/person/role:hint">Chagua jukumu linachoambatana na huyu mtu</span>
          </legend>
<div class="option-wrapper">
<label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="chw" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/chw:label">CHW</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/chw:label">ASC</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/chw:label">सामुदायिक स्वास्थ्यकर्मी</span><span lang="id" class="option-label " data-itext-id="/data/person/role/chw:label">Kader</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/chw:label">महिला स्वास्थ्य स्वयम् सेविका</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/chw:label">Mhudumu wa afya</span></label><label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="chw_supervisor" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/chw_supervisor:label">CHW Supervisor</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/chw_supervisor:label">Superviseur ASC</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/chw_supervisor:label">सामुदायिक स्वास्थ्यकर्मी के मैनेजर</span><span lang="id" class="option-label " data-itext-id="/data/person/role/chw_supervisor:label">Kader Pengawas</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/chw_supervisor:label">महिला स्वास्थ्य स्वयम् सेविकाको सुपरभाइजर</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/chw_supervisor:label">Mkuu wa wahudumu wa afya</span></label><label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="nurse" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/nurse:label">Nurse</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/nurse:label">Infirmier</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/nurse:label">नर्स</span><span lang="id" class="option-label " data-itext-id="/data/person/role/nurse:label">Perawat</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/nurse:label">नर्स</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/nurse:label">Muuguzi</span></label><label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="manager" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/manager:label">Facility Manager</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/manager:label">Personnel médical</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/manager:label">स्वास्थ्य केंद्र के मैनजर</span><span lang="id" class="option-label " data-itext-id="/data/person/role/manager:label">Manajer Fasilitas</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/manager:label">स्वास्थ्य संस्था प्रमुख</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/manager:label">Meneja wa Kituo cha afya</span></label><label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="patient" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/patient:label">Patient</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/patient:label">Patient</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/patient:label">मरीज़</span><span lang="id" class="option-label " data-itext-id="/data/person/role/patient:label">Pasien</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/patient:label">बिरामी</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/patient:label">mgonjwa</span></label><label class=""><input type="radio" name="/data/person/role" data-name="/data/person/role" value="other" data-type-xml="select1"><span lang="en" class="option-label active" data-itext-id="/data/person/role/other:label">Other</span><span lang="fr" class="option-label " data-itext-id="/data/person/role/other:label">Autre</span><span lang="hi" class="option-label " data-itext-id="/data/person/role/other:label">अन्य</span><span lang="id" class="option-label " data-itext-id="/data/person/role/other:label">Lain</span><span lang="ne" class="option-label " data-itext-id="/data/person/role/other:label">अन्य</span><span lang="sw" class="option-label " data-itext-id="/data/person/role/other:label">Ingine</span></label>
</div>
</fieldset></fieldset>
<label class="question or-branch pre-init non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/role_other:label">Specify other</span><span lang="fr" class="question-label " data-itext-id="/data/person/role_other:label">Autre rôle</span><span lang="hi" class="question-label " data-itext-id="/data/person/role_other:label">अन्य का उल्‍लेख करें</span><span lang="id" class="question-label " data-itext-id="/data/person/role_other:label">Tentukan lainnya</span><span lang="ne" class="question-label " data-itext-id="/data/person/role_other:label">अन्य उल्लेख गर्नुहोस्</span><span lang="sw" class="question-label " data-itext-id="/data/person/role_other:label">Jukumu lingine lelote</span><span class="required">*</span><input type="text" name="/data/person/role_other" data-required="true()" data-relevant="selected(  /data/person/role ,'other')" data-type-xml="string"><span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span></label><label class="question non-select "><span lang="en" class="question-label active" data-itext-id="/data/person/external_id:label">External ID</span><span lang="fr" class="question-label " data-itext-id="/data/person/external_id:label">Identifiant externe</span><span lang="hi" class="question-label " data-itext-id="/data/person/external_id:label">बाहरी ID</span><span lang="id" class="question-label " data-itext-id="/data/person/external_id:label">Eksternal ID</span><span lang="ne" class="question-label " data-itext-id="/data/person/external_id:label">बाहिरी ID</span><span lang="sw" class="question-label " data-itext-id="/data/person/external_id:label">ID ya nje</span><input type="text" name="/data/person/external_id" data-type-xml="string"></label><label class="question non-select or-appearance-multiline "><span lang="en" class="question-label active" data-itext-id="/data/person/notes:label">Notes</span><span lang="fr" class="question-label " data-itext-id="/data/person/notes:label">Notes</span><span lang="hi" class="question-label " data-itext-id="/data/person/notes:label">नोट्स</span><span lang="id" class="question-label " data-itext-id="/data/person/notes:label">Catatan</span><span lang="ne" class="question-label " data-itext-id="/data/person/notes:label">टिप्पणी</span><span lang="sw" class="question-label " data-itext-id="/data/person/notes:label">Maelezo</span><textarea name="/data/person/notes" data-type-xml="string"></textarea></label><section class="or-group-data " name="/data/person/user_for_contact">
      </section><section class="or-group-data or-appearance-hidden " name="/data/person/meta">
      </section>
      </section>
  
<fieldset id="or-calculated-items" style="display:none;">
<label class="calculation non-select "><input type="hidden" name="/data/init/type_label" data-calculate="jr:choice-name( /data/init/type_selector ,' /data/init/type_selector ')" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/date_of_birth" data-calculate="../ephemeral_dob/dob_iso" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/date_of_birth_method" data-calculate="../ephemeral_dob/dob_method" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/ephemeral_dob/dob_approx" data-calculate="add-date(today(), 0- /data/person/ephemeral_dob/age_years , 0- /data/person/ephemeral_dob/age_months )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/ephemeral_dob/dob_raw" data-calculate="if(not(selected(  /data/person/ephemeral_dob/dob_method ,'approx')),   /data/person/ephemeral_dob/dob_calendar ,  /data/person/ephemeral_dob/dob_approx )" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/ephemeral_dob/dob_iso" data-calculate='format-date-time(../dob_raw,"%Y-%m-%d")' data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/user_for_contact/create" data-calculate=" /data/person/phone  != '' and (selected(  /data/person/role ,'chw') or selected(  /data/person/role ,'chw_supervisor'))" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/meta/created_by" data-calculate="../../../inputs/user/name" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/meta/created_by_person_uuid" data-calculate="../../../inputs/user/contact_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/person/meta/created_by_place_uuid" data-calculate="../../../inputs/user/facility_id" data-type-xml="string"></label><label class="calculation non-select "><input type="hidden" name="/data/meta/instanceID" data-calculate="concat('uuid:', uuid())" data-type-xml="string"></label>
</fieldset>
</form>`,
  formModel: `
  <model>
    <instance>
        <data xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="contact:person:create" prefix="J1!contact:person:create!" delimiter="#" version="2023-02-14 7-40">
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
          <person>
            <parent>PARENT</parent>
            <type>person</type>
            <name/>
            <short_name/>
            <date_of_birth/>
            <date_of_birth_method/>
            <ephemeral_dob>
              <dob_calendar/>
              <age_label/>
              <age_years/>
              <age_months/>
              <dob_method/>
              <dob_approx/>
              <dob_raw/>
              <dob_iso/>
              <dob_debug/>
            </ephemeral_dob>
            <sex/>
            <phone/>
            <phone_alternate/>
            <role/>
            <role_other/>
            <external_id/>
            <notes/>
            <user_for_contact>
              <create/>
            </user_for_contact>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </person>
          <init>
            <parent_id/>
            <name/>
            <type/>
            <type_selector/>
            <type_label/>
          </init>
          <meta tag="hidden">
            <instanceID/>
          </meta>
        </data>
      </instance>
  </model>

`,
  formXml: `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms">
  <h:head>
    <h:title>New Person</h:title>
    <model>
      <itext>
        <translation lang="en">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>Belongs To</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>Household</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>Health Facility</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>Area</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>Contact ID of the logged in user</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>Place ID of the logged in user</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>Name of the logged in user</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>**Please enter date of birth**</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>Months must between 0 and 11</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>Months</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>Age must be between 0 and 130</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>Years</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>Date of Birth</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>Date must be before today</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>Age</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>DOB Approx: <output value=" /data/person/ephemeral_dob/dob_approx "/>
DOB Calendar: <output value=" /data/person/ephemeral_dob/dob_calendar "/>
DOB ISO: <output value=" /data/person/ephemeral_dob/dob_iso "/></value></text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>Date of birth unknown</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
          </text>
          <text id="/data/person/external_id:label">
            <value>External ID</value>
          </text>
          <text id="/data/person/name:label">
            <value>Full name</value>
          </text>
          <text id="/data/person/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/person/parent:label">
            <value>Parent ID</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</value>
          </text>
          <text id="/data/person/phone:label">
            <value>Phone Number</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>Please enter a valid local number, or use the standard international format, which includes a plus sign (+) and country code. For example: +254712345678</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>Alternate Phone Number</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>CHW</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>CHW Supervisor</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>Facility Manager</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>Nurse</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>Other</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>Patient</value>
          </text>
          <text id="/data/person/role:hint">
            <value>Select the role that best suits this person</value>
          </text>
          <text id="/data/person/role:label">
            <value>Role</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>Specify other</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>Female</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>Male</value>
          </text>
          <text id="/data/person/sex:label">
            <value>Sex</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>Please enter a short name that is preferred by the person.</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>Short name can not be more than 10 characters long.</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>Short name</value>
          </text>
          <text id="/data/person/type:label">
            <value>Person Type</value>
          </text>
        </translation>
        <translation lang="fr">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>Associé avec</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>Zone</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>Hôpital de District</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>Centre de center</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>Identifiant du contact</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>Identifiant du centre</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>Nom</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>Date de naissance inconnue</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob:label">
            <value>-</value>
          </text>
          <text id="/data/person/external_id:label">
            <value>Identifiant externe</value>
          </text>
          <text id="/data/person/name:label">
            <value>Nom</value>
          </text>
          <text id="/data/person/notes:label">
            <value>Notes</value>
          </text>
          <text id="/data/person/parent:label">
            <value>identifiant du parent</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>Veuillez entrer un numéro local valide ou utiliser le format international standard, qui comprend un signe plus (+) et le code du pays. Par exemple: +254712345678</value>
          </text>
          <text id="/data/person/phone:label">
            <value>Téléphone</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>Veuillez entrer un numéro local valide ou utiliser le format international standard, qui comprend un signe plus (+) et le code du pays. Par exemple: +254712345678</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>Téléphone alternatif</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>ASC</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>Superviseur ASC</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>Personnel médical</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>Infirmier</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>Autre</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>Patient</value>
          </text>
          <text id="/data/person/role:hint">
            <value>Sélectionnez le rôle qui convient le mieux à cette personne</value>
          </text>
          <text id="/data/person/role:label">
            <value>Rôle</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>Autre rôle</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>Femme</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>Homme</value>
          </text>
          <text id="/data/person/sex:label">
            <value>Sexe</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>-</value>
          </text>
          <text id="/data/person/type:label">
            <value>Type</value>
          </text>
        </translation>
        <translation lang="hi">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>यह व्यक्ति इस जगह से जुड़ा है</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>क्षेत्र</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>ज़िला</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>स्वास्थ्य केंद्र</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>Contact ID of the logged in user</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>लॉग इन यूज़र के स्थान का ID</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>लॉग इन यूज़र का नाम</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>जन्म की तारीख का पता नहीं</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob:label">
            <value>-</value>
          </text>
          <text id="/data/person/external_id:label">
            <value>बाहरी ID</value>
          </text>
          <text id="/data/person/name:label">
            <value>नाम</value>
          </text>
          <text id="/data/person/notes:label">
            <value>नोट्स</value>
          </text>
          <text id="/data/person/parent:label">
            <value>मूल ID</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>कृपया एक सही स्थानीय नंबर दर्ज करें, या मानक अंतरराष्ट्रीय प्रारूप का उपयोग करें, जिसमें एक प्लस साइन (+) और देश कोड शामिल है। उदाहरण के लिए: +914712345678</value>
          </text>
          <text id="/data/person/phone:label">
            <value>फोन नंबर</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>कृपया एक सही स्थानीय नंबर दर्ज करें, या मानक अंतरराष्ट्रीय प्रारूप का उपयोग करें, जिसमें एक प्लस साइन (+) और देश कोड शामिल है। उदाहरण के लिए: +914712345678</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>अन्य फोन नंबर</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>सामुदायिक स्वास्थ्यकर्मी</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>सामुदायिक स्वास्थ्यकर्मी के मैनेजर</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>स्वास्थ्य केंद्र के मैनजर</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>नर्स</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>अन्य</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>मरीज़</value>
          </text>
          <text id="/data/person/role:hint">
            <value>उस भूमिका का चयन करें जो इस व्यक्ति को सबसे अच्छा सूट करता है</value>
          </text>
          <text id="/data/person/role:label">
            <value>भूमिका</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>अन्य का उल्‍लेख करें</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>स्त्री</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>पुरूष</value>
          </text>
          <text id="/data/person/sex:label">
            <value>लिंग</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>-</value>
          </text>
          <text id="/data/person/type:label">
            <value>व्यक्ति के प्रकार</value>
          </text>
        </translation>
        <translation lang="id">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>Orang ini terhubung ke tempat ini</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>Daerah</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>Kabupaten</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>Fasilitas Kesehatan</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>Contact ID of the logged in user</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>ID Tempat dari login user</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>Nama dari login user</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>Tanggal tidak diketahui lahir</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob:label">
            <value>-</value>
          </text>
          <text id="/data/person/external_id:label">
            <value>Eksternal ID</value>
          </text>
          <text id="/data/person/name:label">
            <value>Nama</value>
          </text>
          <text id="/data/person/notes:label">
            <value>Catatan</value>
          </text>
          <text id="/data/person/parent:label">
            <value>Asli ID</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone:label">
            <value>Nomor Telepon</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>Nomor Telepon Alternatif</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>Kader</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>Kader Pengawas</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>Manajer Fasilitas</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>Perawat</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>Lain</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>Pasien</value>
          </text>
          <text id="/data/person/role:hint">
            <value>Pilih peran yang paling cocok untuk orang ini</value>
          </text>
          <text id="/data/person/role:label">
            <value>Peran</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>Tentukan lainnya</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>Wanita</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>Pria</value>
          </text>
          <text id="/data/person/sex:label">
            <value>Jenis kelamin</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>-</value>
          </text>
          <text id="/data/person/type:label">
            <value>Tipe Orang</value>
          </text>
        </translation>
        <translation lang="ne">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>यो व्यक्ति यस ठाउँसँग सम्बन्धित छ</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>क्षेत्र</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>जिल्ला</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>स्वास्थ्य केन्द्र</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>लग इन गरेको प्रयोगकर्ताको सम्पर्क ID</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>लग इन गरेको प्रयोगकर्ताको स्थानको ID</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>लग इन गरेको प्रयोगकर्ताको नाम</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>जन्म मिती थाहा नभएको</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob:label">
            <value>-</value>
          </text>
          <text id="/data/person/external_id:label">
            <value>बाहिरी ID</value>
          </text>
          <text id="/data/person/name:label">
            <value>नाम</value>
          </text>
          <text id="/data/person/notes:label">
            <value>टिप्पणी</value>
          </text>
          <text id="/data/person/parent:label">
            <value>-</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone:label">
            <value>फोन नम्बर</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>अन्य फोन नम्बर</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>महिला स्वास्थ्य स्वयम् सेविका</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>महिला स्वास्थ्य स्वयम् सेविकाको सुपरभाइजर</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>स्वास्थ्य संस्था प्रमुख</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>नर्स</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>अन्य</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>बिरामी</value>
          </text>
          <text id="/data/person/role:hint">
            <value>यस व्यक्तिका लागि उपयुक्त भूमिका छान्नुहोस्</value>
          </text>
          <text id="/data/person/role:label">
            <value>भूमिका</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>अन्य उल्लेख गर्नुहोस्</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>महिला</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>पुरुष</value>
          </text>
          <text id="/data/person/sex:label">
            <value>लिंग</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>-</value>
          </text>
          <text id="/data/person/type:label">
            <value>-</value>
          </text>
        </translation>
        <translation lang="sw">
          <text id="/data/init/parent_id:hint">
            <value><output value=" /data/init/type_label "/></value>
          </text>
          <text id="/data/init/parent_id:label">
            <value>Ni wa</value>
          </text>
          <text id="/data/init/type_selector/clinic:label">
            <value>Eneo</value>
          </text>
          <text id="/data/init/type_selector/district_hospital:label">
            <value>Wilaya</value>
          </text>
          <text id="/data/init/type_selector/health_center:label">
            <value>Kituo cha afya</value>
          </text>
          <text id="/data/inputs/user/contact_id:label">
            <value>Namba ya Usajilisho ya mtumiaji wa huduma hii</value>
          </text>
          <text id="/data/inputs/user/facility_id:label">
            <value>Kitambulisho cha mahali cha mtumizi wa huduma hii</value>
          </text>
          <text id="/data/inputs/user/name:label">
            <value>Jina ya mtumizi</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_label:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_months:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/age_years:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:hint">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_calendar:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_debug:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method/approx:label">
            <value>Tarehe ya Kuzaliwa</value>
          </text>
          <text id="/data/person/ephemeral_dob/dob_method:label">
            <value>-</value>
          </text>
          <text id="/data/person/ephemeral_dob:label">
            <value>-</value>
          </text>
          <text id="/data/person/external_id:label">
            <value>ID ya nje</value>
          </text>
          <text id="/data/person/name:label">
            <value>Majina</value>
          </text>
          <text id="/data/person/notes:label">
            <value>Maelezo</value>
          </text>
          <text id="/data/person/parent:label">
            <value>ID ya mzazi</value>
          </text>
          <text id="/data/person/phone:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone:label">
            <value>Nambari ya simu</value>
          </text>
          <text id="/data/person/phone_alternate:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/phone_alternate:label">
            <value>nambari nyingine ya simu</value>
          </text>
          <text id="/data/person/role/chw:label">
            <value>Mhudumu wa afya</value>
          </text>
          <text id="/data/person/role/chw_supervisor:label">
            <value>Mkuu wa wahudumu wa afya</value>
          </text>
          <text id="/data/person/role/manager:label">
            <value>Meneja wa Kituo cha afya</value>
          </text>
          <text id="/data/person/role/nurse:label">
            <value>Muuguzi</value>
          </text>
          <text id="/data/person/role/other:label">
            <value>Ingine</value>
          </text>
          <text id="/data/person/role/patient:label">
            <value>mgonjwa</value>
          </text>
          <text id="/data/person/role:hint">
            <value>Chagua jukumu linachoambatana na huyu mtu</value>
          </text>
          <text id="/data/person/role:label">
            <value>Jukumu</value>
          </text>
          <text id="/data/person/role_other:label">
            <value>Jukumu lingine lelote</value>
          </text>
          <text id="/data/person/sex/female:label">
            <value>Kike</value>
          </text>
          <text id="/data/person/sex/male:label">
            <value>Kiume</value>
          </text>
          <text id="/data/person/sex:label">
            <value>Jinsia</value>
          </text>
          <text id="/data/person/short_name:hint">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:jr:constraintMsg">
            <value>-</value>
          </text>
          <text id="/data/person/short_name:label">
            <value>-</value>
          </text>
          <text id="/data/person/type:label">
            <value>Jina</value>
          </text>
        </translation>
      </itext>
      <instance>
        <data id="contact:person:create" prefix="J1!contact:person:create!" delimiter="#" version="2023-02-14 7-40">
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
          <person>
            <parent>PARENT</parent>
            <type>person</type>
            <name/>
            <short_name/>
            <date_of_birth/>
            <date_of_birth_method/>
            <ephemeral_dob>
              <dob_calendar/>
              <age_label/>
              <age_years/>
              <age_months/>
              <dob_method/>
              <dob_approx/>
              <dob_raw/>
              <dob_iso/>
              <dob_debug/>
            </ephemeral_dob>
            <sex/>
            <phone/>
            <phone_alternate/>
            <role/>
            <role_other/>
            <external_id/>
            <notes/>
            <user_for_contact>
              <create/>
            </user_for_contact>
            <meta tag="hidden">
              <created_by/>
              <created_by_person_uuid/>
              <created_by_place_uuid/>
            </meta>
          </person>
          <init>
            <parent_id/>
            <name/>
            <type/>
            <type_selector/>
            <type_label/>
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
      <bind nodeset="/data/init/parent_id" type="string" calculate=" /data/person/parent " readonly="true()"/>
      <bind nodeset="/data/init/name" type="string"/>
      <bind nodeset="/data/init/type" type="string"/>
      <bind nodeset="/data/init/type_selector" type="select1" calculate="../type"/>
      <bind nodeset="/data/init/type_label" type="string" calculate="jr:choice-name( /data/init/type_selector ,' /data/init/type_selector ')"/>
      <bind nodeset="/data/person/parent" type="string"/>
      <bind nodeset="/data/person/type" type="string"/>
      <bind nodeset="/data/person/name" type="string" required="true()"/>
      <bind nodeset="/data/person/short_name" type="string" jr:constraintMsg="jr:itext('/data/person/short_name:jr:constraintMsg')" constraint="string-length(.) &lt;= 10" required="false()"/>
      <bind nodeset="/data/person/date_of_birth" type="string" calculate="../ephemeral_dob/dob_iso" required="true()"/>
      <bind nodeset="/data/person/date_of_birth_method" type="string" calculate="../ephemeral_dob/dob_method"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_calendar" type="date" relevant="not(selected(../dob_method,'approx'))" jr:constraintMsg="jr:itext('/data/person/ephemeral_dob/dob_calendar:jr:constraintMsg')" required="true()" constraint=". &lt;= now()"/>
      <bind nodeset="/data/person/ephemeral_dob/age_label" readonly="true()" type="string" relevant="selected(../dob_method,'approx')"/>
      <bind nodeset="/data/person/ephemeral_dob/age_years" type="int" jr:constraintMsg="jr:itext('/data/person/ephemeral_dob/age_years:jr:constraintMsg')" relevant="selected(../dob_method,'approx')" constraint=". &gt;= 0 and . &lt;= 130" required="true()"/>
      <bind nodeset="/data/person/ephemeral_dob/age_months" type="int" jr:constraintMsg="jr:itext('/data/person/ephemeral_dob/age_months:jr:constraintMsg')" relevant="selected(../dob_method,'approx')" constraint=". &gt;= 0 and . &lt;= 11"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_method" type="select"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_approx" type="string" calculate="add-date(today(), 0- /data/person/ephemeral_dob/age_years , 0- /data/person/ephemeral_dob/age_months )"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_raw" type="string" calculate="if(not(selected(  /data/person/ephemeral_dob/dob_method ,'approx')), 
 /data/person/ephemeral_dob/dob_calendar ,
 /data/person/ephemeral_dob/dob_approx )"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_iso" type="string" calculate="format-date-time(../dob_raw,&quot;%Y-%m-%d&quot;)"/>
      <bind nodeset="/data/person/ephemeral_dob/dob_debug" readonly="true()" type="string" relevant="false()"/>
      <bind nodeset="/data/person/sex" type="select1" required="true()"/>
      <bind nodeset="/data/person/phone" type="tel" jr:constraintMsg="jr:itext('/data/person/phone:jr:constraintMsg')" constraint="true()"/>
      <bind nodeset="/data/person/phone_alternate" type="tel" jr:constraintMsg="jr:itext('/data/person/phone_alternate:jr:constraintMsg')" constraint="true()"/>
      <bind nodeset="/data/person/role" type="select1"/>
      <bind nodeset="/data/person/role_other" type="string" relevant="selected(  /data/person/role ,'other')" required="true()"/>
      <bind nodeset="/data/person/external_id" type="string"/>
      <bind nodeset="/data/person/notes" type="string"/>
      <bind nodeset="/data/person/user_for_contact/create" type="string" calculate=" /data/person/phone  != '' and (selected(  /data/person/role ,'chw') or selected(  /data/person/role ,'chw_supervisor'))"/>
      <bind nodeset="/data/person/meta/created_by" type="string" calculate="../../../inputs/user/name"/>
      <bind nodeset="/data/person/meta/created_by_person_uuid" type="string" calculate="../../../inputs/user/contact_id"/>
      <bind nodeset="/data/person/meta/created_by_place_uuid" type="string" calculate="../../../inputs/user/facility_id"/>
      <bind nodeset="/data/meta/instanceID" type="string" readonly="true()" calculate="concat('uuid:', uuid())"/>
    </model>
  </h:head>
  <h:body>
    <group ref="/data/inputs">
      <group ref="/data/inputs/user">
        <input ref="/data/inputs/user/contact_id">
          <label ref="jr:itext('/data/inputs/user/contact_id:label')"/>
        </input>
        <input ref="/data/inputs/user/facility_id">
          <label ref="jr:itext('/data/inputs/user/facility_id:label')"/>
        </input>
        <input ref="/data/inputs/user/name">
          <label ref="jr:itext('/data/inputs/user/name:label')"/>
        </input>
      </group>
    </group>
    <group ref="/data/init">
      <input appearance="db-object" ref="/data/init/parent_id">
        <label ref="jr:itext('/data/init/parent_id:label')"/>
        <hint ref="jr:itext('/data/init/parent_id:hint')"/>
      </input>
      <input appearance="hidden" ref="/data/init/name"/>
      <input appearance="hidden" ref="/data/init/type"/>
      <select1 appearance="hidden" ref="/data/init/type_selector">
        <item>
          <label ref="jr:itext('/data/init/type_selector/district_hospital:label')"/>
          <value>district_hospital</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/type_selector/health_center:label')"/>
          <value>health_center</value>
        </item>
        <item>
          <label ref="jr:itext('/data/init/type_selector/clinic:label')"/>
          <value>clinic</value>
        </item>
      </select1>
    </group>
    <group ref="/data/person">
      <input ref="/data/person/name">
        <label ref="jr:itext('/data/person/name:label')"/>
      </input>
      <input ref="/data/person/short_name">
        <label ref="jr:itext('/data/person/short_name:label')"/>
        <hint ref="jr:itext('/data/person/short_name:hint')"/>
      </input>
      <group ref="/data/person/ephemeral_dob">
        <input ref="/data/person/ephemeral_dob/dob_calendar">
          <label ref="jr:itext('/data/person/ephemeral_dob/dob_calendar:label')"/>
          <hint ref="jr:itext('/data/person/ephemeral_dob/dob_calendar:hint')"/>
        </input>
        <input ref="/data/person/ephemeral_dob/age_label">
          <label ref="jr:itext('/data/person/ephemeral_dob/age_label:label')"/>
        </input>
        <input ref="/data/person/ephemeral_dob/age_years">
          <label ref="jr:itext('/data/person/ephemeral_dob/age_years:label')"/>
        </input>
        <input ref="/data/person/ephemeral_dob/age_months">
          <label ref="jr:itext('/data/person/ephemeral_dob/age_months:label')"/>
        </input>
        <select appearance="columns" ref="/data/person/ephemeral_dob/dob_method">
          <label ref="jr:itext('/data/person/ephemeral_dob/dob_method:label')"/>
          <item>
            <label ref="jr:itext('/data/person/ephemeral_dob/dob_method/approx:label')"/>
            <value>approx</value>
          </item>
        </select>
        <input ref="/data/person/ephemeral_dob/dob_debug">
          <label ref="jr:itext('/data/person/ephemeral_dob/dob_debug:label')"/>
        </input>
      </group>
      <select1 appearance="columns" ref="/data/person/sex">
        <label ref="jr:itext('/data/person/sex:label')"/>
        <item>
          <label ref="jr:itext('/data/person/sex/female:label')"/>
          <value>female</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/sex/male:label')"/>
          <value>male</value>
        </item>
      </select1>
      <input ref="/data/person/phone">
        <label ref="jr:itext('/data/person/phone:label')"/>
      </input>
      <input ref="/data/person/phone_alternate">
        <label ref="jr:itext('/data/person/phone_alternate:label')"/>
      </input>
      <select1 ref="/data/person/role">
        <label ref="jr:itext('/data/person/role:label')"/>
        <hint ref="jr:itext('/data/person/role:hint')"/>
        <item>
          <label ref="jr:itext('/data/person/role/chw:label')"/>
          <value>chw</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/role/chw_supervisor:label')"/>
          <value>chw_supervisor</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/role/nurse:label')"/>
          <value>nurse</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/role/manager:label')"/>
          <value>manager</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/role/patient:label')"/>
          <value>patient</value>
        </item>
        <item>
          <label ref="jr:itext('/data/person/role/other:label')"/>
          <value>other</value>
        </item>
      </select1>
      <input ref="/data/person/role_other">
        <label ref="jr:itext('/data/person/role_other:label')"/>
      </input>
      <input ref="/data/person/external_id">
        <label ref="jr:itext('/data/person/external_id:label')"/>
      </input>
      <input appearance="multiline" ref="/data/person/notes">
        <label ref="jr:itext('/data/person/notes:label')"/>
      </input>
      <group ref="/data/person/user_for_contact"/>
      <group appearance="hidden" ref="/data/person/meta"/>
    </group>
  </h:body>
</h:html>
`,   
};
