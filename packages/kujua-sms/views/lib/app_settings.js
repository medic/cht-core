
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
   "muvuku_webapp_url": '/json-forms/_design/json-forms/_rewrite/?_embed_mode=2',
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
           "key": "district",
           "en": "field office",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "districts",
           "en": "field offices",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District",
           "en": "Field Office",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Districts",
           "en": "Field Offices",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Name",
           "en": "Field Office Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Contact Name",
           "en": "SMO",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Contact Phone",
           "en": "SMO Phone",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Hospital",
           "en": "Field Office",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Hospitals",
           "en": "Field Offices",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Hospital Name",
           "en": "Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "District Hospital Contact Name",
           "en": "SMO",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Center",
           "en": "District",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Centers",
           "en": "Districts",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Center Name",
           "en": "District Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Center Contact",
           "en": "District Contact",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Center Contact Name",
           "en": "District Contact Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Health Center Contact Phone",
           "en": "District Contact Phone",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "clinic",
           "en": "reporting unit",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "clinics",
           "en": "reporting units",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinic",
           "en": "Reporting Unit",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinics",
           "en": "Reporting Units",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinic Name",
           "en": "Reporting Unit Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinic Contact",
           "en": "Reporting Unit Contact",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinic Contact Name",
           "en": "Reporting Unit Contact Name",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "Clinic Contact Phone",
           "en": "Reporting Unit Contact Phone",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "RC Code",
           "en": "RU Code",
           "fr": "",
           "ne": "",
           "es": ""
       },
       {
           "key": "sys.recipient_not_found",
           "en": "Could not find message recipient.",
           "fr": "Le recipient du message n'a pas été trouvé.",
           "ne": "",
           "es": ""
       },
       {
           "key": "sys.missing_fields",
           "en": "Missing or invalid fields: %(fields).",
           "fr": "Champs invalides ou manquants: %(fields).",
           "ne": "",
           "es": ""
       },
       {
           "key": "missing_fields",
           "en": "Missing or invalid fields: %(fields).",
           "fr": "Champs invalides ou manquants: %(fields).",
           "ne": "",
           "es": ""
       },
       {
           "key": "extra_fields",
           "en": "Extra fields.",
           "fr": "Champs additionels.",
           "ne": "",
           "es": ""
       },
       {
           "key": "sys.form_not_found",
           "en": "Form '%(form)' not found.",
           "fr": "Formulaire '%(form)' non trouvé",
           "ne": "",
           "es": ""
       },
       {
           "key": "form_not_found",
           "en": "The form sent '%(form)' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '%(form)' n'est pas reconnu, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "ne": "",
           "es": ""
       },
       {
           "key": "form_invalid",
           "en": "The form sent '{{ form }}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '{{ form }}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "ne": "",
           "es": ""
       },
       {
           "key": "form_invalid_custom",
           "en": "The form sent '{{ form }}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
           "fr": "Le formulaire envoyé '{{ form }}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur.",
           "es": "No se completo el reporte '{{ form }}'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director.",
           "ne": "तपाईले फारम भरेको मिलेन। कृपया फेरि भरेर प्रयास गर्नुहोला।"
       },
       {
           "key": "sys.facility_not_found",
           "en": "Facility not found.",
           "fr": "Établissement non trouvé.",
           "ne": "",
           "es": ""
       },
       {
           "key": "sys.empty",
           "en": "Message appears empty.",
           "fr": "Le message recu est vide.",
           "ne": "",
           "es": ""
       },
       {
           "key": "empty",
           "en": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor.",
           "fr": "Nous avons des troubles avec votre message, SVP renvoyer. Si vous continuez à avoir des problèmes contactez votre superviseur.",
           "ne": "",
           "es": ""
       },
       {
           "key": "form_received",
           "en": "Your form submission was received, thank you.",
           "fr": "Merci, votre formulaire a été bien reçu.",
           "ne": "",
           "es": ""
       },
       {
           "key": "sms_received",
           "en": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again.",
           "fr": "Merci, votre message a été bien reçu.",
           "ne": "",
           "es": ""
       },
       {
           "key": "reporting_unit_not_found",
           "en": "Reporting Unit ID is incorrect. Please correct and submit a complete report again.",
           "fr": "Établissement non trouvé, svp corriger et renvoyer",
           "ne": "",
           "es": ""
       },
       {
           "key": "reported_date",
           "en": "Reported Date",
           "fr": "Date envoyé",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.clinic.name",
           "en": "Clinic Name",
           "fr": "Villages",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.clinic.contact.name",
           "en": "Clinic Contact Name",
           "fr": "Personne-ressource Clinique",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.clinic.parent.name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.clinic.parent.contact.name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.clinic.parent.parent.name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.health_center.name",
           "en": "Health Center Name",
           "fr": "Nom du centre de santé",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.health_center.contact.name",
           "en": "Health Center Contact Name",
           "fr": "Nom de la santé Contact Center",
           "ne": "",
           "es": ""
       },
       {
           "key": "related_entities.health_center.parent.name",
           "en": "District Hospital Name",
           "fr": "Nom de l'hôpital de district",
           "ne": "",
           "es": ""
       },
       {
           "key": "tasks.0.messages.0.to",
           "en": "To",
           "fr": "pour",
           "ne": "",
           "es": ""
       },
       {
           "key": "tasks.0.messages.0.message",
           "en": "Message",
           "fr": "Message",
           "ne": "",
           "es": ""
       },
       {
           "key": "from",
           "en": "From",
           "fr": "Envoyé par",
           "ne": "",
           "es": ""
       },
       {
           "key": "sent_timestamp",
           "en": "Sent Timestamp",
           "fr": "Date",
           "ne": "",
           "es": ""
       },
       {
           "key": "daysoverdue",
           "en": "Days since patient visit",
           "fr": "",
           "ne": "",
           "es": ""
       }
   ]
};
