
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
   "muvuku_webapp_url": '/muvuku-webapp/_design/muvuku-webapp/_rewrite/?_embed_mode=2',
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
   "weekly_reminders": [
       {
           "form": "VPD",
           "day": "Sunday",
           "message": "Please submit last week's {{form}} report immediately."
       },
       {
           "form": "VPD",
           "day": "Thursday",
           "message": "Today is the last day to submit last week's {{form}} report. Please submit."
       }
   ],
   "schedule_morning_hours": 8,
   "schedule_evening_hours": 17,
   "synthetic_date": "",
   "translations": [
       {
           "key": "Contact",
           "en": "Contact",
           "fr": "Contactez",
           "ne": "",
           "es": "Contacto",
           "sw": "kuwasiliana na"
       },
       {
           "key": "From",
           "en": "From",
           "fr": "à partir de",
           "ne": "",
           "es": "De",
           "sw": "kutoka"
       },
       {
           "key": "Village Name",
           "en": "Village Name",
           "fr": "Nom du Village",
           "ne": "",
           "es": "Nombre Village",
           "sw": "Jina kijiji"
       },
       {
           "key": "Clinic Contact Name",
           "en": "Clinic Contact Name",
           "fr": "Clinique Contact Nom",
           "ne": "",
           "es": "Clínica de Contacto Nombre",
           "sw": "Kliniki ya Mawasiliano Jina"
       },
       {
           "key": "RC Code",
           "en": "RC Code",
           "fr": "RC code",
           "ne": "",
           "es": "Código RC",
           "sw": "RC Kanuni"
       },
       {
           "key": "Health Center",
           "en": "Health Center",
           "fr": "Centre de santé",
           "ne": "",
           "es": "Centro de Salud",
           "sw": "Kituo cha Afya cha"
       },
       {
           "key": "Health Center Name",
           "en": "Health Center Name",
           "fr": "Santé Nom du centre",
           "ne": "",
           "es": "Salud Nombre del centro",
           "sw": "Kituo cha Afya cha Jina"
       },
       {
           "key": "Health Center Contact Name",
           "en": "Health Center Contact Name",
           "fr": "Centre de santé Nom du contact",
           "ne": "",
           "es": "Centro de Salud de Contacto Nombre",
           "sw": "Kituo cha Afya cha Mawasiliano Jina"
       },
       {
           "key": "Health Center Contact Phone",
           "en": "Health Center Contact Phone",
           "fr": "Centre de santé Contact Tel",
           "ne": "",
           "es": "Centro de Salud Teléfono de Contacto",
           "sw": "Kituo cha Afya cha Mawasiliano Simu"
       },
       {
           "key": "District",
           "en": "District",
           "fr": "District",
           "ne": "",
           "es": "Distrito",
           "sw": "Wilaya ya"
       },
       {
           "key": "District Name",
           "en": "District Name",
           "fr": "Nom du district",
           "ne": "",
           "es": "Nombre del distrito",
           "sw": "Wilaya ya Jina"
       },
       {
           "key": "District Contact Name",
           "en": "District Contact Name",
           "fr": "Quartier Contact Nom",
           "ne": "",
           "es": "Distrito Nombre de contacto",
           "sw": "Wilaya ya Mawasiliano Jina"
       },
       {
           "key": "District Contact Phone",
           "en": "District Contact Phone",
           "fr": "Quartier Contact Téléphone",
           "ne": "",
           "es": "Distrito de Contacto Teléfono",
           "sw": "Wilaya ya Mawasiliano Simu"
       },
       {
           "key": "Phone",
           "en": "Phone",
           "fr": "Téléphone",
           "ne": "",
           "es": "Teléfono",
           "sw": "Simu"
       },
       {
           "key": "sys.recipient_not_found",
           "en": "Could not find message recipient.",
           "fr": "Le recipient du message n'a pas été trouvé.",
           "ne": "",
           "es": "No se encontro destinatario para el mensaje.",
           "sw": ""
       },
       {
           "key": "sys.missing_fields",
           "en": "Missing or invalid fields: %(fields).",
           "fr": "Champs invalides ou manquants: %(fields).",
           "ne": "",
           "es": "Campo invalido o faltante: %(fields).",
           "sw": ""
       },
       {
           "key": "missing_fields",
           "en": "Missing or invalid fields: %(fields).",
           "fr": "Champs invalides ou manquants: %(fields).",
           "ne": "तपाईले फारम पूरा भर्नुभएन। कृपया पुरा गरेर फेरि पठाउन प्रयास गर्नुहोला।",
           "es": "Campo invalido o faltante: %(fields).",
           "sw": ""
       },
       {
           "key": "extra_fields",
           "en": "Extra fields.",
           "fr": "Champs additionels.",
           "ne": "तपाईले फारम भरेको मिलेन। कृपया फेरि भरेर प्रयास गर्नुहोला।",
           "es": "Campos extra.",
           "sw": ""
       },
       {
           "key": "sys.form_not_found",
           "en": "Form '%(form)' not found.",
           "fr": "Formulaire '%(form)' non trouvé",
           "ne": "",
           "es": "Forma no encontrada.",
           "sw": ""
       },
       {
           "key": "form_not_found",
           "en": "The form sent '%(form)' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '%(form)' n'est pas reconnu, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "ne": "डाटा प्राप्त भएन। कृपया फेरि भरेर प्रयास गर्नुहोला।",
           "es": "No se reconocio el reporte enviado '%(form)'. Por favor intente de nuevo. Si el problema persiste, informe al director.",
           "sw": ""
       },
       {
           "key": "form_invalid",
           "en": "The form sent '%(form)' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '%(form)' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "ne": "तपाईले फारम भरेको मिलेन। कृपया फेरि भरेर प्रयास गर्नुहोला।",
           "es": "No se completo el reporte '%(form)'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director.",
           "sw": ""
       },
       {
           "key": "form_invalid_custom",
           "en": "The form sent '%(form)' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '%(form)' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "ne": "तपाईले फारम भरेको मिलेन। कृपया फेरि भरेर प्रयास गर्नुहोला।",
           "es": "No se completo el reporte '%(form)'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director.",
           "sw": ""
       },
       {
           "key": "sys.facility_not_found",
           "en": "Facility not found.",
           "fr": "Établissement non trouvé.",
           "ne": "",
           "es": "No se encontro a la unidad de salud.",
           "sw": ""
       },
       {
           "key": "sys.empty",
           "en": "Message appears empty.",
           "fr": "Le message recu est vide.",
           "ne": "",
           "es": "El mensaje esta en blanco.",
           "sw": ""
       },
       {
           "key": "empty",
           "en": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor.",
           "fr": "Nous avons des troubles avec votre message, SVP renvoyer. Si vous continuez à avoir des problèmes contactez votre superviseur.",
           "ne": "डाटा प्राप्त भएन। कृपया फेरि भरेर प्रयास गर्नुहोला।",
           "es": "El mensaje esta en blanco, por favor reenvielo. Si encuentra un problema, informe al director.",
           "sw": ""
       },
       {
           "key": "form_received",
           "en": "Your form submission was received, thank you.",
           "fr": "Merci, votre formulaire a été bien reçu.",
           "ne": "डाटा प्राप्त भयो, धन्यवाद",
           "es": "Recibimos su reporte, muchas gracias.",
           "sw": ""
       },
       {
           "key": "sms_received",
           "en": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again.",
           "fr": "Merci, votre message a été bien reçu.",
           "ne": "मेसेज प्राप्त भयो। यदि रिपोर्ट पठाउनुभएको हो भने मिलेन; मिलाएर पुन: पठाउनुहोला।",
           "es": "Recibimos tu mensaje, lo procesaremos pronto. Si querias mandar un reporte, intentalo nuevamente en el formato adecuado.",
           "sw": ""
       },
       {
           "key": "reporting_unit_not_found",
           "en": "Reporting Unit ID is incorrect. Please correct and submit a complete report again.",
           "fr": "Établissement non trouvé, svp corriger et renvoyer",
           "ne": " रिपोर्टिङ् युनिटको आइ.डि मिलेन। कृपया सहि आइ.डि राखेर पुरा रिपोर्ट फेरि पठाउनुहोला।",
           "es": "No encontramos a su centro de salud. Por favor corrijalo y reenvie el reporte.",
           "sw": ""
       },
       {
           "key": "reported_date",
           "en": "Reported Date",
           "fr": "Date envoyé",
           "ne": "",
           "es": "Fecha de envío",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.name",
           "en": "Clinic Name",
           "fr": "Villages",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.contact.name",
           "en": "Clinic Contact Name",
           "fr": "Personne-ressource Clinique",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.contact.name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.clinic.parent.parent.name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.contact.name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "related_entities.health_center.parent.name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "tasks.0.messages.0.to",
           "en": "To",
           "fr": "pour",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "tasks.0.messages.0.message",
           "en": "Message",
           "fr": "Message",
           "ne": "",
           "es": "",
           "sw": ""
       },
       {
           "key": "from",
           "en": "From",
           "fr": "Envoyé par",
           "ne": "",
           "es": "De",
           "sw": ""
       },
       {
           "key": "sent_timestamp",
           "en": "Sent Timestamp",
           "fr": "Date",
           "ne": "",
           "es": "Fecha",
           "sw": ""
       },
       {
           "key": "daysoverdue",
           "en": "Days since patient visit",
           "fr": "",
           "ne": "",
           "es": "",
           "sw": ""
       }
   ]
};
