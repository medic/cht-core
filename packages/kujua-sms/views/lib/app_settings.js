
/*
 * Default app_settings values. This file will get merged with the actual
 * `app_settings` property on the design doc.
 *
 * If you add a new value to kanso.json settings_schema then you should update
 * this file also.  If you forget to update this then new defauls won't show up
 * in settings until it gets saved in the dashboard. This can be an issue if
 * you have a new feature that expects a setting default value.
 */

module.exports = {
   "locales": [
      {
          "code": "en",
          "name": "English"
      },
      {
          "code": "es",
          "name": "Spanish"
      },
      {
          "code": "fr",
          "name": "French"
      },
      {
          "code": "ne",
          "name": "Nepali"
      },
      {
          "code": "sw",
          "name": "Swahili"
      }
   ],
   "locale": "en",
   "muvuku_webapp_url": "/medic-reporter/_design/medic-reporter/_rewrite/?_embed_mode=2",
   "date_format": "DD-MMM-YYYY",
   "reported_date_format": "DD-MMM-YYYY HH:mm:ss",
   "forms_only_mode": false,
   "default_responses": {
       "start_date": ""
   },
   "district_admins_access_unallocated_messages": false,
   "public_access": false,
   "default_country_code": 1,
   "gateway_number": "+13125551212",
   "kujua-reporting": [
       {
           "code": "VPD",
           "reporting_freq": "weekly"
       }
   ],
   "anc_forms": {
      "registration": "R",
      "registrationLmp": "P",
      "visit": "V",
      "delivery": "D",
      "flag": "F"
   },
   "schedule_morning_hours": 0,
   "schedule_morning_minutes": 0,
   "schedule_evening_hours": 23,
   "schedule_evening_minutes": 0,
   "synthetic_date": "",
   "contact_display_short": "clinic.name",
   "translations": [
       {
           "key": "Contact",
           "default": "Contact",
           "en": "Contact",
           "fr": "Contact",
           "es": "Contacto",
           "ne": "सम्पर्क व्यक्ति",
           "sw": "kuwasiliana na"
       },
       {
           "key": "From",
           "default": "From",
           "en": "From",
           "fr": "De",
           "es": "De",
           "ne": "पठाउने",
           "sw": "kutoka"
       },
       {
           "key": "Clinics",
           "default": "Community Health Workers",
           "en": "Community Health Workers",
           "fr": "Agents de santé",
           "es": "Agento de salud",
           "ne": "सामुदायिक स्वास्थ्यकर्मि",
           "sw": ""
       },
       {
           "key": "Village Name",
           "default": "Town",
           "en": "Town",
           "fr": "Ville",
           "es": "Ciudia",
           "ne": "गाउँ",
           "sw": "Jina kijiji"
       },
       {
           "key": "Clinic Contact Name",
           "default": "Name",
           "en": "Name",
           "fr": "Nom",
           "es": "Nombre",
           "ne": "सम्पर्क व्यक्ति",
           "sw": "Kliniki ya Mawasiliano Jina"
       },
       {
           "key": "Clinic Contact Phone",
           "default": "Phone number",
           "en": "Phone number",
           "fr": "Téléphone",
           "es": "Teléfono",
           "ne": "सम्पर्क टेलिफोन",
           "sw": "Namba ya Simu"
       },
       {
           "key": "RC Code",
           "default": "Code",
           "en": "Code",
           "fr": "Code",
           "es": "Código",
           "ne": "कोड",
           "sw": "RC Kanuni"
       },
       {
           "key": "Health Centers",
           "default": "Health Centers",
           "en": "Health Centers",
           "fr": "Centres de santé",
           "es": "Centros de Salud",
           "ne": "स्वास्थ्य संस्था",
           "sw": "Kituo cha Afya cha"
       },
       {
           "key": "Health Center",
           "default": "Health Center",
           "en": "Health Center",
           "fr": "Centre de santé",
           "es": "Centro de Salud",
           "ne": "स्वास्थ्य संस्था",
           "sw": "Kituo cha Afya cha"
       },
       {
           "key": "Health Center Name",
           "default": "Health Center Name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "es": "Nombre del centro de salud",
           "ne": "स्वास्थ्य संस्थाको नाम",
           "sw": "Kituo cha Afya cha Jina"
       },
       {
           "key": "Health Center Contact Name",
           "default": "Contact Name",
           "en": "Contact Name",
           "fr": "Nom du contact",
           "es": "Nombre del contacto",
           "ne": "सम्पर्क व्यक्ति",
           "sw": "Kituo cha Afya cha Mawasiliano Jina"
       },
       {
           "key": "Health Center Contact Phone",
           "default": "Phone number",
           "en": "Phone number",
           "fr": "Téléphone",
           "es": "Teléfono",
           "ne": "सम्पर्क टेलिफोन",
           "sw": "Namba ya Simu"
       },
       {
           "key": "District",
           "default": "District",
           "en": "District",
           "fr": "District",
           "es": "Distrito",
           "ne": "जिल्ला​",
           "sw": "Wilaya ya"
       },
       {
           "key": "District Name",
           "default": "District Name",
           "en": "District Name",
           "fr": "Nom du district",
           "es": "Nombre del distrito",
           "ne": "जिल्लाको नाम",
           "sw": "Wilaya ya Jina"
       },
       {
           "key": "District Contact Name",
           "default": "Contact Name",
           "en": "Contact Name",
           "fr": "Nom du contact",
           "es": "Nombre del contacto",
           "ne": "सम्पर्क व्यक्ति",
           "sw": "Wilaya ya Mawasiliano Jina"
       },
       {
           "key": "District Contact Phone",
           "default": "Phone number",
           "en": "Phone number",
           "fr": "Téléphone",
           "es": "Teléfono",
           "ne": "सम्पर्क टेलिफोन",
           "sw": "Namba ya Simu"
       },
       {
           "key": "Phone",
           "default": "Phone",
           "en": "Phone",
           "fr": "Téléphone",
           "es": "Teléfono",
           "ne": "टेलिफोन",
           "sw": "Simu"
       },
       {
           "key": "sys.recipient_not_found",
           "default": "Could not find message recipient.",
           "en": "Could not find message recipient.",
           "fr": "Le recipient du message n'a pas été trouvé.",
           "es": "No se encontro destinatario para el mensaje.",
           "ne": "सन्देश​ पाउने व्यक्ति पत्ता लगाउन असफल।​",
           "sw": ""
       },
       {
           "key": "sys.missing_fields",
           "default": "Missing or invalid fields: {{fields}}.",
           "en": "Missing or invalid fields: {{fields}}.",
           "fr": "Champs invalides ou manquants: {{fields}}.",
           "es": "Campo invalido o faltante: {{fields}}.",
           "ne": "फारम पूरा  ​नभएको या नमिलेको​।",
           "sw": ""
       },
       {
           "key": "missing_fields",
           "default": "Missing or invalid fields: {{fields}}.",
           "en": "Missing or invalid fields: {{fields}}.",
           "fr": "Champs invalides ou manquants: {{fields}}.",
           "es": "Campo invalido o faltante: {{fields}}.",
           "ne": "फारम पूरा ​नभएको या नमिलेको​।",
           "sw": ""
       },
       {
           "key": "extra_fields",
           "default": "Extra fields.",
           "en": "Extra fields.",
           "fr": "Champs additionels.",
           "es": "Campos extra.",
           "ne": "फारममा भर्नुपर्ने भन्दा अतिरिक्त कुरा भरिएको।",
           "sw": ""
       },
       {
           "key": "sys.form_not_found",
           "default": "Form '{{form}}' not found.",
           "en": "Form '{{form}}' not found.",
           "fr": "Formulaire '{{form}}' non trouvé",
           "es": "Forma no encontrada.",
           "ne": "फारम भेटिएन।​",
           "sw": ""
       },
       {
           "key": "form_not_found",
           "default": "The form sent '{{form}}' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
           "en": "The form sent '{{form}}' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '{{form}}' n'est pas reconnu, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "es": "No se reconocio el reporte enviado '{{form}}'. Por favor intente de nuevo. Si el problema persiste, informe al director.",
           "ne": "फारम मिलेन​। कृपया फेरि प्रयास गर्नुहोला।",
           "sw": "Ujumbe huu wa {{form}} si sahihi. Tafadhali urekebishe na utume tena. Shida hii ikiendela wasiliana na CHEW wako."
       },
       {
           "key": "form_invalid",
           "default": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "en": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '{{form}}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "es": "No se completo el reporte '{{form}}'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director.",
           "ne": "फारम ​पूरा भएन​। कृपया फेरि प्रयास गर्नुहोला।",
           "sw": ""
       },
       {
           "key": "form_invalid_custom",
           "default": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "en": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '{{form}}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "es": "No se completo el reporte '{{form}}'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director.",
           "ne": "फारम  ​पूरा भएन​। कृपया फेरि प्रयास गर्नुहोला।",
           "sw": ""
       },
       {
           "key": "sys.facility_not_found",
           "default": "Facility not found.",
           "en": "Facility not found.",
           "fr": "Établissement non trouvé.",
           "es": "No se encontro a la unidad de salud.",
           "ne": "सम्बन्धित स्वास्थ्य संस्था पत्ता लगाउन असफल।",
           "sw": ""
       },
       {
           "key": "sys.empty",
           "default": "Message appears empty.",
           "en": "Message appears empty.",
           "fr": "Le message recu est vide.",
           "es": "El mensaje esta en blanco.",
           "ne": "सन्देश​ खाली छ।",
           "sw": ""
       },
       {
           "key": "empty",
           "default": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor.",
           "en": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor.",
           "fr": "Nous avons des troubles avec votre message, SVP renvoyer. Si vous continuez à avoir des problèmes contactez votre superviseur.",
           "es": "El mensaje esta en blanco, por favor reenvielo. Si encuentra un problema, informe al director.",
           "ne": "सन्देश​ खाली छ​ । कृपया फेरि प्रयास गर्नुहोला।",
           "sw": ""
       },
       {
           "key": "form_received",
           "default": "Your form submission was received, thank you.",
           "en": "Your form submission was received, thank you.",
           "fr": "Merci, votre formulaire a été bien reçu.",
           "es": "Recibimos su reporte, muchas gracias.",
           "ne": "रिपोर्ट​ प्राप्त भयो, धन्यवाद ​।",
           "sw": ""
       },
       {
           "key": "sms_received",
           "default": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again.",
           "en": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again.",
           "fr": "Merci, votre message a été bien reçu.",
           "es": "Recibimos tu mensaje, lo procesaremos pronto. Si querias mandar un reporte, intentalo nuevamente en el formato adecuado.",
           "ne": "सन्देश​ प्राप्त भयो। रिपोर्ट पठाउनुभएको हो भने मिलेन; ​पुन:​ पठाउनुहोला।",
           "sw": "Ujumbe wako tumeupokea na unakaguliwa. Kama ujumbe huu ni wa kusajilisha, kuthibitisha, kurudisha au kusitisha vikumbusho ama kuripoti kuzaa, tafadhali urekebishe na utume."
       },
       {
           "key": "reporting_unit_not_found",
           "default": "Reporting Unit ID is incorrect. Please correct and submit a complete report again.",
           "en": "Reporting Unit ID is incorrect. Please correct and submit a complete report again.",
           "fr": "Établissement non trouvé, svp corriger et renvoyer",
           "es": "No encontramos a su centro de salud. Por favor corrijalo y reenvie el reporte.",
           "ne": "रिपोर्टिङ् युनिटको आइ.डि मिलेन। कृपया ​मिलाएर​  ​पुन:​ पठाउनुहोला।",
           "sw": ""
       },
       {
           "key": "reported_date",
           "default": "Reported Date",
           "en": "Reported Date",
           "fr": "Date envoyé",
           "es": "Fecha de envío",
           "ne": "रिपोर्ट पठाएको मिति​",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.name",
           "default": "Clinic Name",
           "en": "Clinic Name",
           "fr": "Villages",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.contact.name",
           "default": "Clinic Contact Name",
           "en": "Clinic Contact Name",
           "fr": "Personne-ressource Clinique",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.external_id",
           "default": "Clinic External ID",
           "en": "Clinic External ID",
           "fr": "",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.name",
           "default": "Health Center Name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.contact.name",
           "default": "Health Center Contact Name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.external_id",
           "default": "Health Center External ID",
           "en": "Health Center External ID",
           "fr": "",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.parent.name",
           "default": "District Hospital Name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.parent.external_id",
           "default": "District Hospital External ID",
           "en": "District Hospital External ID",
           "fr": "",
           "es": "",
           "ne": "",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.name",
           "default": "Health Center Name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "es": "",
           "ne": "स्वास्थ्य संस्थाको नाम​",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.contact.name",
           "default": "Health Center Contact Name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "es": "",
           "ne": "स्वास्थ्य संस्थाको सम्पर्क व्यक्ति",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.parent.name",
           "default": "District Hospital Name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "es": "",
           "ne": "जिल्ला अस्पतालको नाम",
           "sw": ""
       },
       {
           "key": "from",
           "default": "Reported From",
           "en": "Reported From",
           "fr": "Envoyé par",
           "es": "De",
           "ne": "पठाउने",
           "sw": ""
       },
       {
           "key": "sent_timestamp",
           "default": "Sent Timestamp",
           "en": "Sent Timestamp",
           "fr": "Date",
           "es": "Fecha",
           "ne": "​रिपोर्ट पठाएको समय",
           "sw": ""
       },
       {
           "key": "_id",
           "default": "Record UUID",
           "en": "Record UUID",
           "fr": "Record UUID",
           "es": "Record UUID",
           "ne": "Record UUID",
           "sw": "Record UUID"
       },
       {
           "key": "patient_id",
           "default": "Patient ID",
           "en": "Patient ID",
           "fr": "Patient ID",
           "es": "Patient ID",
           "ne": "Patient ID",
           "sw": "Patient ID"
       },
       {
           "key": "daysoverdue",
           "default": "Days since patient visit",
           "en": "Days since patient visit",
           "fr": "Jours depuis visite du patient",
           "es": "",
           "ne": "बिरामीलाई भेटेको कति दिन भयो?​",
           "sw": ""
       },
       {
           "key": "Patient ID",
           "default": "Patient ID",
           "en": "Patient ID",
           "fr": "Patient ID",
           "es": "Patient ID",
           "ne": "Patient ID",
           "sw": "Patient ID"
       },
       {
           "key": "responses",
           "default": "Responses",
           "en": "Responses",
           "fr": "Responses",
           "es": "Responses",
           "ne": "Responses",
           "sw": "Responses"
       },
       {
           "key": "sms_message.message",
           "default": "Incoming Message",
           "en": "Incoming Message",
           "fr": "Incoming Message",
           "es": "Incoming Message",
           "ne": "Incoming Message",
           "sw": "Incoming Message"
       },
       {
           "key": "tasks",
           "default": "Outgoing Messages",
           "en": "Outgoing Messages",
           "fr": "Outgoing Messages",
           "es": "Outgoing Messages",
           "ne": "Outgoing Messages",
           "sw": "Outgoing Messages"
       },
       {
           "key": "scheduled_tasks",
           "default": "Scheduled Tasks",
           "en": "Scheduled Tasks",
           "fr": "Scheduled Tasks",
           "es": "Scheduled Tasks",
           "ne": "Scheduled Tasks",
           "sw": "Scheduled Tasks"
       },
       {
           "key": "Search",
           "default": "Search",
           "en": "Search",
           "fr": "Search",
           "es": "Search",
           "ne": "Search",
           "sw": "Search"
       },
       {
           "key": "pending",
           "default": "Pending Timestamp",
           "en": "Pending Timestamp"
       },
       {
           "key": "scheduled",
           "default": "Scheduled Timestamp",
           "en": "Scheduled Timestamp"
       },
       {
           "key": "received",
           "default": "Received Timestamp",
           "en": "Received Timestamp"
       },
       {
           "key": "sent",
           "default": "Sent Timestamp",
           "en": "Sent Timestamp"
       },
       {
           "key": "cleared",
           "default": "Cleared Timestamp",
           "en": "Cleared Timestamp"
       },
       {
           "key": "muted",
           "default": "Muted Timestamp",
           "en": "Muted Timestamp"
       },
       {
           "key": "denied",
           "default": "Denied Timestamp",
           "en": "Denied Timestamp"
       },
       {
           "key": "task.type",
           "default": "Message Type",
           "en": "Message Type"
       },
       {
           "key": "task.state",
           "default": "Message State",
           "en": "Message State"
       },
      {
          "key": "Reply",
          "default": "Reply",
          "en": "Reply"
      },
      {
          "key": "Verify",
          "default": "Verify",
          "en": "Verify"
      },
      {
          "key": "Unverify",
          "default": "Unverify",
          "en": "Unverify"
      },
      {
          "key": "Delete",
          "default": "Delete",
          "en": "Delete"
      },
      {
          "key": "Edit",
          "default": "Edit",
          "en": "Edit"
      }
   ],
   "forms": {
        "YYYY": {
            meta: {code: "YYYY", label: 'Test Monthly Report'},
            fields: {
                facility_id: {
                    labels: {
                        short: 'Health Facility Identifier',
                        tiny: 'HFI'
                    },
                    type: 'string',
                    required: true
                },
                 year: {
                     labels: {
                         short: 'Report Year',
                         tiny: 'RPY'
                     },
                     type: 'integer',
                     validate: {is_numeric_year: true},
                     required: true
                 },
                 month: {
                     labels: {
                         short: 'Report Month',
                         tiny: 'RPM'
                     },
                     type: 'integer',
                     validations: {is_numeric_month: true},
                     list: [
                        [ 1, { "en": "January" } ],
                        [ 2, { "en": "February" } ],
                        [ 3, { "en": "March" } ],
                        [ 4, { "en": "April" } ],
                        [ 5, { "en": "May" } ],
                        [ 6, { "en": "June" } ],
                        [ 7, { "en": "July" } ],
                        [ 8, { "en": "August" } ],
                        [ 9, { "en": "September" } ],
                        [ 10, { "en": "October" } ],
                        [ 11, { "en": "November" } ],
                        [ 12, { "en": "December" } ]
                     ],
                     required: true
                 },
                 misoprostol_administered: {
                    type: 'boolean',
                    labels: {
                       short: {
                          en: 'Misoprostol?'
                       },
                       tiny: {
                          en: 'MSP'
                       },
                       description: {
                          en: 'Was misoprostol administered?'
                       }
                    }
                 },
                 'quantity_dispensed.la_6x1': {
                     labels: {
                         short: 'LA 6x1: Dispensed total',
                         tiny: 'L1T'
                     },
                     type: 'integer'
                 },
                 'quantity_dispensed.la_6x2': {
                     labels: {
                         short: 'LA 6x2: Dispensed total',
                         tiny: 'L2T'
                     },
                     type: 'integer'
                 },
                 'quantity_dispensed.cotrimoxazole': {
                     labels: {
                         short: 'Cotrimoxazole: Dispensed total',
                         tiny: 'CDT'
                     },
                     type: 'integer'
                 },
                 'quantity_dispensed.zinc': {
                     labels: {
                         short: 'Zinc: Dispensed total',
                         tiny: 'ZDT'
                     },
                     type: 'integer'
                 },
                 'quantity_dispensed.ors': {
                     labels: {
                         short: 'ORS: Dispensed total',
                         tiny: 'ODT'
                     },
                     type: 'integer'
                 },
                 'quantity_dispensed.eye_ointment': {
                     labels: {
                         short: 'Eye Ointment: Dispensed total',
                         tiny: 'EOT'
                     },
                     type: 'integer'
                 },
                 'days_stocked_out.la_6x1': {
                     labels: {
                         short: 'LA 6x1: Days stocked out',
                         tiny: 'L1O'
                     },
                     type: 'integer'
                 },
                 'days_stocked_out.la_6x2': {
                     labels: {
                         short: 'LA 6x2: Days stocked out',
                         tiny: 'L2O'
                     },
                     type: 'integer'},
                 'days_stocked_out.cotrimoxazole': {
                     labels: {
                         short: 'Cotrimoxazole: Days stocked out',
                         tiny: 'CDO'
                     },
                     type: 'integer'},
                 'days_stocked_out.zinc': {
                     labels: {
                         short: 'Zinc: Days stocked out',
                         tiny: 'ZDO'
                     },
                     type: 'integer'},
                 'days_stocked_out.ors': {
                     labels: {
                         short: 'ORS: Days stocked out',
                         tiny: 'ODO'
                     },
                     type: 'integer'},
                 'days_stocked_out.eye_ointment': {
                     labels: {
                         short: 'Eye Ointment: Days stocked out',
                         tiny: 'EDO'
                     },
                     type: 'integer'}
            },
            autoreply: "Zikomo!",
            facility_reference: "facility_id",
            /*
             * messages_task is a function returns array of message objects,
             * e.g: [{to: '+123', message: 'foo'},...]
             * context includes: phone, clinic, keys, labels, values
             * Health Center -> Hospital
             */
            messages_task: "function() {var msg = [], ignore = [], dh_ph = clinic && clinic.parent && clinic.parent.parent && clinic.parent.parent.contact && clinic.parent.parent.contact.phone; keys.forEach(function(key) { if (ignore.indexOf(key) === -1) { msg.push(labels.shift() + ': ' + values.shift()); } else { labels.shift(); values.shift(); } }); return {to:dh_ph, message:msg.join(', ')}; }"
        },
        "YYYZ": {
            meta: {code: "YYYZ", label: 'Test Form - Required fields'},
            fields: {
                one: {
                    labels: {
                        short: 'One',
                        tiny: 'one'
                    },
                    type: 'string',
                    required: true
                },
                two: {
                    labels: {
                        short: 'Two',
                        tiny: 'two'
                    },
                    type: 'string',
                    required: true
                },
                birthdate: {
                     labels: {
                         short: 'Birth Date',
                         tiny: 'BIR'
                     },
                     type: 'date'
                }
            }
        },
        "YYYX": {
            meta: {code: "YYYX", label: 'Test Form - Required Facility'},
            fields: {
                id: {
                    labels: {
                        short: 'ID'
                    },
                    type: 'string',
                    required: true
                },
                foo: {
                    labels: {
                        short: 'Foo'
                    },
                    type: 'string',
                    required: true
                }
            },
            facility_reference: "id",
            facility_required: true
        },
        "YYYW": {
            meta: {
                code: "YYYW",
                label: 'Test Form - Public Form'
            },
            fields: {
                id: {
                    labels: {
                        short: 'ID'
                    },
                    type: 'string',
                    required: true
                },
                foo: {
                    labels: {
                        short: 'Foo'
                    },
                    type: 'string',
                    required: true
                }
            },
            public_form: true
        },
        "YYYV": {
            meta: {
                code: "YYYV",
                label: 'Test Labels'
            },
            fields: {
                id: {
                    labels: {
                        short: {
                            'fr': 'Identifier'
                        }
                    },
                    type: 'string',
                    required: true
                },
                foo: {
                    labels: {
                        short: {
                            'fr': 'Foo Bar'
                        }
                    },
                    type: 'string',
                    required: true
                }
            }
        },
        "YYYU": {
              "meta": {
                 "code": "YYYU",
                 "label": {
                    "fr": "Contre-référence"
                 }
              },
              "fields": {
                 "cref_year": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Année"
                       }
                    },
                    "position": 0,
                    "type": "integer",
                    "length": [
                       4,
                       4
                    ],
                    "validations": {
                       "is_numeric_year": true
                    },
                    "flags": {}
                 },
                 "cref_month": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Mois"
                       }
                    },
                    "position": 1,
                    "type": "integer",
                    "length": [
                       1,
                       2
                    ],
                    "validations": {
                       "is_numeric_month": true
                    },
                    "flags": {},
                    "list": [
                       [
                          1,
                          {
                             "fr": "Janvier"
                          }
                       ],
                       [
                          2,
                          {
                             "fr": "Février"
                          }
                       ],
                       [
                          3,
                          {
                             "fr": "Mars"
                          }
                       ],
                       [
                          4,
                          {
                             "fr": "Avril"
                          }
                       ],
                       [
                          5,
                          {
                             "fr": "Mai"
                          }
                       ],
                       [
                          6,
                          {
                             "fr": "Juin"
                          }
                       ],
                       [
                          7,
                          {
                             "fr": "Juillet"
                          }
                       ],
                       [
                          8,
                          {
                             "fr": "Aout"
                          }
                       ],
                       [
                          9,
                          {
                             "fr": "Septembre"
                          }
                       ],
                       [
                          10,
                          {
                             "fr": "Octobre"
                          }
                       ],
                       [
                          11,
                          {
                             "fr": "Novembre"
                          }
                       ],
                       [
                          12,
                          {
                             "fr": "Décembre"
                          }
                       ]
                    ]
                 },
                 "cref_day": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Jour"
                       }
                    },
                    "position": 2,
                    "type": "integer",
                    "length": [
                       1,
                       2
                    ],
                    "validations": {
                       "is_numeric_day": true
                    },
                    "flags": {}
                 },
                 "cref_rc": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Code du RC"
                       }
                    },
                    "position": 3,
                    "type": "string",
                    "length": [
                       11,
                       11
                    ],
                    "validations": {},
                    "flags": {
                       "input_digits_only": true
                    }
                 },
                 "cref_ptype": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Type de patient"
                       }
                    },
                    "position": 4,
                    "type": "integer",
                    "length": [
                       1,
                       2
                    ],
                    "validations": {},
                    "flags": {},
                    "list": [
                       [
                          1,
                          {
                             "fr": "Femme enceinte"
                          }
                       ],
                       [
                          2,
                          {
                             "fr": "Accouchée malade"
                          }
                       ],
                       [
                          3,
                          {
                             "fr": "Enfant"
                          }
                       ],
                       [
                          4,
                          {
                             "fr": "Nouveau né"
                          }
                       ],
                       [
                          5,
                          {
                             "fr": "Autre"
                          }
                       ]
                    ]
                 },
                 "cref_name": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Nom"
                       }
                    },
                    "position": 5,
                    "type": "string",
                    "length": [
                       0,
                       20
                    ],
                    "validations": {},
                    "flags": {}
                 },
                 "cref_age": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Age"
                       }
                    },
                    "position": 6,
                    "type": "integer",
                    "length": [
                       1,
                       2
                    ],
                    "validations": {},
                    "flags": {}
                 },
                 "cref_mom": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Nom de la mère ou de l'accompagnant"
                       }
                    },
                    "position": 7,
                    "type": "string",
                    "length": [
                       0,
                       20
                    ],
                    "validations": {},
                    "flags": {}
                 },
                 "cref_treated": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Patient traité pour"
                       }
                    },
                    "position": 8,
                    "type": "string",
                    "length": [
                       0,
                       20
                    ],
                    "validations": {},
                    "flags": {}
                 },
                 "cref_rec": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Recommandations/Conseils"
                       }
                    },
                    "position": 9,
                    "type": "integer",
                    "length": [
                       1,
                       2
                    ],
                    "validations": {},
                    "flags": {},
                    "list": [
                       [
                          1,
                          {
                             "fr": "Accusé réception"
                          }
                       ],
                       [
                          2,
                          {
                             "fr": "Non recu, rechercher le malade"
                          }
                       ],
                       [
                          3,
                          {
                             "fr": "Revenir au CS"
                          }
                       ],
                       [
                          4,
                          {
                             "fr": "Suivi à domicile"
                          }
                       ],
                       [
                          5,
                          {
                             "fr": "Guéri"
                          }
                       ],
                       [
                          6,
                          {
                             "fr": "Décédé"
                          }
                       ],
                       [
                          7,
                          {
                             "fr": "Référé"
                          }
                       ],
                       [
                          8,
                          {
                             "fr": "Evadé"
                          }
                       ],
                       [
                          9,
                          {
                             "fr": "Refus d'admission"
                          }
                       ],
                       [
                          10,
                          {
                             "fr": "Conseils hygiéno-diététiques"
                          }
                       ],
                       [
                          11,
                          {
                             "fr": "Autres"
                          }
                       ]
                    ]
                 },
                 "cref_reason": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Précisions pour recommandations"
                       }
                    },
                    "position": 10,
                    "type": "string",
                    "length": [
                       0,
                       35
                    ],
                    "validations": {},
                    "flags": {}
                 },
                 "cref_agent": {
                    "labels": {
                       "long": null,
                       "description": null,
                       "short": {
                          "fr": "Nom de l'agent de santé"
                       }
                    },
                    "position": 11,
                    "type": "string",
                    "length": [
                       0,
                       20
                    ],
                    "validations": {},
                    "flags": {}
                 }
              },
              "facility_reference": "cref_rc"
        }
   }
};
