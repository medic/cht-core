
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
   "muvuku_webapp_url": "/muvuku-webapp/_design/muvuku-webapp/_rewrite/?_embed_mode=2",
   "reported_date_format": "MMM hh:mm",
   "forms_only_mode": false,
   "public_access": false,
   "gateway_number": "+13125551212",
   "kujua-reporting": [
       {
           "code": "VPD",
           "reporting_freq": "weekly"
       }
   ],
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
           "sw": ""
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
           "sw": ""
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
       }
   ]
};
