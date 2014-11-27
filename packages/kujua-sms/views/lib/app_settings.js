
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
          "translations": [
              {
                  "locale": "en",
                  "content": "Contact"
              },
              {
                  "locale": "fr",
                  "content": "Contact"
              },
              {
                  "locale": "es",
                  "content": "Contacto"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": "kuwasiliana na"
              }
          ]
      },
      {
          "key": "From",
          "default": "From",
          "translations": [
              {
                  "locale": "en",
                  "content": "From"
              },
              {
                  "locale": "fr",
                  "content": "De"
              },
              {
                  "locale": "es",
                  "content": "De"
              },
              {
                  "locale": "ne",
                  "content": "पठाउने"
              },
              {
                  "locale": "sw",
                  "content": "kutoka"
              }
          ]
      },
      {
          "key": "Clinic",
          "default": "Community Health Worker",
          "translations": [
              {
                  "locale": "en",
                  "content": "Community Health Worker"
              },
              {
                  "locale": "fr",
                  "content": "Agent de santé"
              },
              {
                  "locale": "es",
                  "content": "Agento de salud"
              },
              {
                  "locale": "ne",
                  "content": "सामुदायिक स्वास्थ्यकर्मि"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "Clinics",
          "default": "Community Health Workers",
          "translations": [
              {
                  "locale": "en",
                  "content": "Community Health Workers"
              },
              {
                  "locale": "fr",
                  "content": "Agents de santé"
              },
              {
                  "locale": "es",
                  "content": "Agento de salud"
              },
              {
                  "locale": "ne",
                  "content": "सामुदायिक स्वास्थ्यकर्मि"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "Village Name",
          "default": "Town",
          "translations": [
              {
                  "locale": "en",
                  "content": "Town"
              },
              {
                  "locale": "fr",
                  "content": "Ville"
              },
              {
                  "locale": "es",
                  "content": "Ciudia"
              },
              {
                  "locale": "ne",
                  "content": "गाउँ"
              },
              {
                  "locale": "sw",
                  "content": "Jina kijiji"
              }
          ]
      },
      {
          "key": "Clinic Contact Name",
          "default": "Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom"
              },
              {
                  "locale": "es",
                  "content": "Nombre"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": "Kliniki ya Mawasiliano Jina"
              }
          ]
      },
      {
          "key": "Clinic Contact Phone",
          "default": "Phone number",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone number"
              },
              {
                  "locale": "fr",
                  "content": "Téléphone"
              },
              {
                  "locale": "es",
                  "content": "Teléfono"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क टेलिफोन"
              },
              {
                  "locale": "sw",
                  "content": "Namba ya Simu"
              }
          ]
      },
      {
          "key": "RC Code",
          "default": "Code",
          "translations": [
              {
                  "locale": "en",
                  "content": "Code"
              },
              {
                  "locale": "fr",
                  "content": "Code"
              },
              {
                  "locale": "es",
                  "content": "Código"
              },
              {
                  "locale": "ne",
                  "content": "कोड"
              },
              {
                  "locale": "sw",
                  "content": "RC Kanuni"
              }
          ]
      },
      {
          "key": "Health Centers",
          "default": "Health Centers",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Centers"
              },
              {
                  "locale": "fr",
                  "content": "Centres de santé"
              },
              {
                  "locale": "es",
                  "content": "Centros de Salud"
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्था"
              },
              {
                  "locale": "sw",
                  "content": "Kituo cha Afya cha"
              }
          ]
      },
      {
          "key": "Health Center",
          "default": "Health Center",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center"
              },
              {
                  "locale": "fr",
                  "content": "Centre de santé"
              },
              {
                  "locale": "es",
                  "content": "Centro de Salud"
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्था"
              },
              {
                  "locale": "sw",
                  "content": "Kituo cha Afya cha"
              }
          ]
      },
      {
          "key": "Health Center Name",
          "default": "Health Center Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du centre de santé"
              },
              {
                  "locale": "es",
                  "content": "Nombre del centro de salud"
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्थाको नाम"
              },
              {
                  "locale": "sw",
                  "content": "Kituo cha Afya cha Jina"
              }
          ]
      },
      {
          "key": "Health Center Contact Name",
          "default": "Contact Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Contact Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du contact"
              },
              {
                  "locale": "es",
                  "content": "Nombre del contacto"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": "Kituo cha Afya cha Mawasiliano Jina"
              }
          ]
      },
      {
          "key": "Health Center Contact Phone",
          "default": "Phone number",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone number"
              },
              {
                  "locale": "fr",
                  "content": "Téléphone"
              },
              {
                  "locale": "es",
                  "content": "Teléfono"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क टेलिफोन"
              },
              {
                  "locale": "sw",
                  "content": "Namba ya Simu"
              }
          ]
      },
      {
          "key": "District Hospital",
          "default": "District",
          "translations": [
              {
                  "locale": "en",
                  "content": "District"
              },
              {
                  "locale": "fr",
                  "content": "District"
              },
              {
                  "locale": "es",
                  "content": "Distrito"
              },
              {
                  "locale": "ne",
                  "content": "जिल्ला​"
              },
              {
                  "locale": "sw",
                  "content": "Wilaya ya"
              }
          ]
      },
      {
          "key": "District",
          "default": "District",
          "translations": [
              {
                  "locale": "en",
                  "content": "District"
              },
              {
                  "locale": "fr",
                  "content": "District"
              },
              {
                  "locale": "es",
                  "content": "Distrito"
              },
              {
                  "locale": "ne",
                  "content": "जिल्ला​"
              },
              {
                  "locale": "sw",
                  "content": "Wilaya ya"
              }
          ]
      },
      {
          "key": "District Name",
          "default": "District Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "District Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du district"
              },
              {
                  "locale": "es",
                  "content": "Nombre del distrito"
              },
              {
                  "locale": "ne",
                  "content": "जिल्लाको नाम"
              },
              {
                  "locale": "sw",
                  "content": "Wilaya ya Jina"
              }
          ]
      },
      {
          "key": "District Contact Name",
          "default": "Contact Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Contact Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du contact"
              },
              {
                  "locale": "es",
                  "content": "Nombre del contacto"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": "Wilaya ya Mawasiliano Jina"
              }
          ]
      },
      {
          "key": "District Contact Phone",
          "default": "Phone number",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone number"
              },
              {
                  "locale": "fr",
                  "content": "Téléphone"
              },
              {
                  "locale": "es",
                  "content": "Teléfono"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क टेलिफोन"
              },
              {
                  "locale": "sw",
                  "content": "Namba ya Simu"
              }
          ]
      },
      {
          "key": "Phone",
          "default": "Phone",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone"
              },
              {
                  "locale": "fr",
                  "content": "Téléphone"
              },
              {
                  "locale": "es",
                  "content": "Teléfono"
              },
              {
                  "locale": "ne",
                  "content": "टेलिफोन"
              },
              {
                  "locale": "sw",
                  "content": "Simu"
              }
          ]
      },
      {
          "key": "Export",
          "default": "Export",
          "translations": [
              {
                  "locale": "en",
                  "content": "Export"
              },
              {
                  "locale": "fr",
                  "content": "Exporter"
              },
              {
                  "locale": "es",
                  "content": "Exportar"
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": "Kuuza nje"
              }
          ]
      },
      {
          "key": "Activity",
          "default": "Activity",
          "translations": [
              {
                  "locale": "en",
                  "content": "Activity"
              },
              {
                  "locale": "fr",
                  "content": "Activité"
              },
              {
                  "locale": "es",
                  "content": "Actividad"
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": "Shughuli"
              }
          ]
      },
      {
          "key": "Facilities",
          "default": "Facilities",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facilities"
              },
              {
                  "locale": "fr",
                  "content": "Equipements"
              },
              {
                  "locale": "es",
                  "content": "Comodidades"
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": "Vifaa"
              }
          ]
      },
      {
          "key": "Reporting Rates",
          "default": "Reporting Rates",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reporting Rates"
              },
              {
                  "locale": "fr",
                  "content": "Déclaration des taux de"
              },
              {
                  "locale": "es",
                  "content": "Informes de Cambio"
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": "Taarifa ya Viwango"
              }
          ]
      },
      {
          "key": "sys.recipient_not_found",
          "default": "Could not find message recipient.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Could not find message recipient."
              },
              {
                  "locale": "fr",
                  "content": "Le recipient du message n'a pas été trouvé."
              },
              {
                  "locale": "es",
                  "content": "No se encontro destinatario para el mensaje."
              },
              {
                  "locale": "ne",
                  "content": "सन्देश​ पाउने व्यक्ति पत्ता लगाउन असफल।​"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sys.missing_fields",
          "default": "Missing or invalid fields: {{fields}}.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Missing or invalid fields: {{fields}}."
              },
              {
                  "locale": "fr",
                  "content": "Champs invalides ou manquants: {{fields}}."
              },
              {
                  "locale": "es",
                  "content": "Campo invalido o faltante: {{fields}}."
              },
              {
                  "locale": "ne",
                  "content": "फारम पूरा  ​नभएको या नमिलेको​।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "missing_fields",
          "default": "Missing or invalid fields: {{fields}}.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Missing or invalid fields: {{fields}}."
              },
              {
                  "locale": "fr",
                  "content": "Champs invalides ou manquants: {{fields}}."
              },
              {
                  "locale": "es",
                  "content": "Campo invalido o faltante: {{fields}}."
              },
              {
                  "locale": "ne",
                  "content": "फारम पूरा ​नभएको या नमिलेको​।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "extra_fields",
          "default": "Extra fields.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Extra fields."
              },
              {
                  "locale": "fr",
                  "content": "Champs additionels."
              },
              {
                  "locale": "es",
                  "content": "Campos extra."
              },
              {
                  "locale": "ne",
                  "content": "फारममा भर्नुपर्ने भन्दा अतिरिक्त कुरा भरिएको।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sys.form_not_found",
          "default": "Form '{{form}}' not found.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Form '{{form}}' not found."
              },
              {
                  "locale": "fr",
                  "content": "Formulaire '{{form}}' non trouvé"
              },
              {
                  "locale": "es",
                  "content": "Forma no encontrada."
              },
              {
                  "locale": "ne",
                  "content": "फारम भेटिएन।​"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "form_not_found",
          "default": "The form sent '{{form}}' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The form sent '{{form}}' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
              },
              {
                  "locale": "fr",
                  "content": "Le formulaire envoyé '{{form}}' n'est pas reconnu, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "No se reconocio el reporte enviado '{{form}}'. Por favor intente de nuevo. Si el problema persiste, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "फारम मिलेन​। कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "form_invalid",
          "default": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor."
              },
              {
                  "locale": "fr",
                  "content": "Le formulaire envoyé '{{form}}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "No se completo el reporte '{{form}}'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "फारम ​पूरा भएन​। कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "form_invalid_custom",
          "default": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The form sent '{{form}}' was not properly completed. Please complete it and resend. If this problem persists contact your supervisor."
              },
              {
                  "locale": "fr",
                  "content": "Le formulaire envoyé '{{form}}' n'est pas complet, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "No se completo el reporte '{{form}}'. Por favor completelo y vuelvalo a enviar. Si el problema persiste, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "फारम  ​पूरा भएन​। कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sys.facility_not_found",
          "default": "Facility not found.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facility not found."
              },
              {
                  "locale": "fr",
                  "content": "Établissement non trouvé."
              },
              {
                  "locale": "es",
                  "content": "No se encontro a la unidad de salud."
              },
              {
                  "locale": "ne",
                  "content": "सम्बन्धित स्वास्थ्य संस्था पत्ता लगाउन असफल।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sys.empty",
          "default": "Message appears empty.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message appears empty."
              },
              {
                  "locale": "fr",
                  "content": "Le message recu est vide."
              },
              {
                  "locale": "es",
                  "content": "El mensaje esta en blanco."
              },
              {
                  "locale": "ne",
                  "content": "सन्देश​ खाली छ।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "empty",
          "default": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor.",
          "translations": [
              {
                  "locale": "en",
                  "content": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor."
              },
              {
                  "locale": "fr",
                  "content": "Nous avons des troubles avec votre message, SVP renvoyer. Si vous continuez à avoir des problèmes contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "El mensaje esta en blanco, por favor reenvielo. Si encuentra un problema, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "सन्देश​ खाली छ​ । कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "form_received",
          "default": "Your form submission was received, thank you.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Your form submission was received, thank you."
              },
              {
                  "locale": "fr",
                  "content": "Merci, votre formulaire a été bien reçu."
              },
              {
                  "locale": "es",
                  "content": "Recibimos su reporte, muchas gracias."
              },
              {
                  "locale": "ne",
                  "content": "रिपोर्ट​ प्राप्त भयो, धन्यवाद ​।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sms_received",
          "default": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again.",
          "translations": [
              {
                  "locale": "en",
                  "content": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again."
              },
              {
                  "locale": "fr",
                  "content": "Merci, votre message a été bien reçu."
              },
              {
                  "locale": "es",
                  "content": "Recibimos tu mensaje, lo procesaremos pronto. Si querias mandar un reporte, intentalo nuevamente en el formato adecuado."
              },
              {
                  "locale": "ne",
                  "content": "सन्देश​ प्राप्त भयो। रिपोर्ट पठाउनुभएको हो भने मिलेन; ​पुन:​ पठाउनुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "reporting_unit_not_found",
          "default": "Reporting Unit ID is incorrect. Please correct and submit a complete report again.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reporting Unit ID is incorrect. Please correct and submit a complete report again."
              },
              {
                  "locale": "fr",
                  "content": "Établissement non trouvé, svp corriger et renvoyer"
              },
              {
                  "locale": "es",
                  "content": "No encontramos a su centro de salud. Por favor corrijalo y reenvie el reporte."
              },
              {
                  "locale": "ne",
                  "content": "रिपोर्टिङ् युनिटको आइ.डि मिलेन। कृपया ​मिलाएर​  ​पुन:​ पठाउनुहोला।"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "_id",
          "default": "Record UUID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Record UUID"
              },
              {
                  "locale": "fr",
                  "content": "Record UUID"
              },
              {
                  "locale": "es",
                  "content": "Record UUID"
              },
              {
                  "locale": "ne",
                  "content": "Record UUID"
              },
              {
                  "locale": "sw",
                  "content": "Record UUID"
              }
          ]
      },
      {
          "key": "patient_id",
          "default": "Patient ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Patient ID"
              },
              {
                  "locale": "fr",
                  "content": "Patient ID"
              },
              {
                  "locale": "es",
                  "content": "Patient ID"
              },
              {
                  "locale": "ne",
                  "content": "Patient ID"
              },
              {
                  "locale": "sw",
                  "content": "Patient ID"
              }
          ]
      },
      {
          "key": "reported_date",
          "default": "Reported Date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reported Date"
              },
              {
                  "locale": "fr",
                  "content": "Date envoyé"
              },
              {
                  "locale": "es",
                  "content": "Fecha de envío"
              },
              {
                  "locale": "ne",
                  "content": "रिपोर्ट पठाएको मिति​"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.name",
          "default": "Clinic Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Clinic Name"
              },
              {
                  "locale": "fr",
                  "content": "Villages"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.contact.name",
          "default": "Clinic Contact Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Clinic Contact Name"
              },
              {
                  "locale": "fr",
                  "content": "Personne-ressource Clinique"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.external_id",
          "default": "Clinic External ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Clinic External ID"
              }
          ]
      },
      {
          "key": "related_entities.clinic.parent.name",
          "default": "Health Center Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du centre de santé"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.parent.contact.name",
          "default": "Health Center Contact Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center Contact Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom de la santé Contact Center"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.parent.external_id",
          "default": "Health Center External ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center External ID"
              }
          ]
      },
      {
          "key": "related_entities.clinic.parent.parent.name",
          "default": "District Hospital Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "District Hospital Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom de l'hôpital de district"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.clinic.parent.parent.external_id",
          "default": "District Hospital External ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "District Hospital External ID"
              }
          ]
      },
      {
          "key": "related_entities.health_center.name",
          "default": "Health Center Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom du centre de santé"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्थाको नाम​"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.health_center.contact.name",
          "default": "Health Center Contact Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Health Center Contact Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom de la santé Contact Center"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्थाको सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "related_entities.health_center.parent.name",
          "default": "District Hospital Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "District Hospital Name"
              },
              {
                  "locale": "fr",
                  "content": "Nom de l'hôpital de district"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "जिल्ला अस्पतालको नाम"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "tasks.0.state",
          "default": "State",
          "translations": [
              {
                  "locale": "en",
                  "content": "State"
              },
              {
                  "locale": "fr",
                  "content": "State"
              },
              {
                  "locale": "es",
                  "content": "State"
              },
              {
                  "locale": "ne",
                  "content": "State"
              },
              {
                  "locale": "sw",
                  "content": "State"
              }
          ]
      },
      {
          "key": "tasks.0.timestamp",
          "default": "Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Timestamp"
              },
              {
                  "locale": "fr",
                  "content": "Timestamp"
              },
              {
                  "locale": "es",
                  "content": "Timestamp"
              },
              {
                  "locale": "ne",
                  "content": "Timestamp"
              },
              {
                  "locale": "sw",
                  "content": "Timestamp"
              }
          ]
      },
      {
          "key": "tasks.0.messages.0.to",
          "default": "To",
          "translations": [
              {
                  "locale": "en",
                  "content": "To"
              },
              {
                  "locale": "fr",
                  "content": "pour"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "पाउने"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "tasks.0.messages.0.message",
          "default": "Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message"
              },
              {
                  "locale": "fr",
                  "content": "Message"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "सन्देश"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "from",
          "default": "From",
          "translations": [
              {
                  "locale": "en",
                  "content": "From"
              },
              {
                  "locale": "fr",
                  "content": "Envoyé par"
              },
              {
                  "locale": "es",
                  "content": "De"
              },
              {
                  "locale": "ne",
                  "content": "पठाउने"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "sent_timestamp",
          "default": "Sent Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Sent Timestamp"
              },
              {
                  "locale": "fr",
                  "content": "Date"
              },
              {
                  "locale": "es",
                  "content": "Fecha"
              },
              {
                  "locale": "ne",
                  "content": "​रिपोर्ट पठाएको समय"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "daysoverdue",
          "default": "Days since patient visit",
          "translations": [
              {
                  "locale": "en",
                  "content": "Days since patient visit"
              },
              {
                  "locale": "fr",
                  "content": "Jours depuis visite du patient"
              },
              {
                  "locale": "es",
                  "content": ""
              },
              {
                  "locale": "ne",
                  "content": "बिरामीलाई भेटेको कति दिन भयो?​"
              },
              {
                  "locale": "sw",
                  "content": ""
              }
          ]
      },
      {
          "key": "Patient ID",
          "default": "Patient ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Patient ID"
              },
              {
                  "locale": "fr",
                  "content": "Patient ID"
              },
              {
                  "locale": "es",
                  "content": "Patient ID"
              },
              {
                  "locale": "ne",
                  "content": "Patient ID"
              },
              {
                  "locale": "sw",
                  "content": "Patient ID"
              }
          ]
      },
      {
          "key": "responses",
          "default": "Responses",
          "translations": [
              {
                  "locale": "en",
                  "content": "Responses"
              },
              {
                  "locale": "fr",
                  "content": "Responses"
              },
              {
                  "locale": "es",
                  "content": "Responses"
              },
              {
                  "locale": "ne",
                  "content": "Responses"
              },
              {
                  "locale": "sw",
                  "content": "Responses"
              }
          ]
      },
      {
          "key": "sms_message.message",
          "default": "Incoming Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Incoming Message"
              },
              {
                  "locale": "fr",
                  "content": "Incoming Message"
              },
              {
                  "locale": "es",
                  "content": "Incoming Message"
              },
              {
                  "locale": "ne",
                  "content": "Incoming Message"
              },
              {
                  "locale": "sw",
                  "content": "Incoming Message"
              }
          ]
      },
      {
          "key": "tasks",
          "default": "Outgoing Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Outgoing Messages"
              },
              {
                  "locale": "fr",
                  "content": "Outgoing Messages"
              },
              {
                  "locale": "es",
                  "content": "Outgoing Messages"
              },
              {
                  "locale": "ne",
                  "content": "Outgoing Messages"
              },
              {
                  "locale": "sw",
                  "content": "Outgoing Messages"
              }
          ]
      },
      {
          "key": "scheduled_tasks",
          "default": "Scheduled Tasks",
          "translations": [
              {
                  "locale": "en",
                  "content": "Scheduled Tasks"
              },
              {
                  "locale": "fr",
                  "content": "Scheduled Tasks"
              },
              {
                  "locale": "es",
                  "content": "Scheduled Tasks"
              },
              {
                  "locale": "ne",
                  "content": "Scheduled Tasks"
              },
              {
                  "locale": "sw",
                  "content": "Scheduled Tasks"
              }
          ]
      },
      {
          "key": "Search",
          "default": "Search",
          "translations": [
              {
                  "locale": "en",
                  "content": "Search"
              },
              {
                  "locale": "fr",
                  "content": "Search"
              },
              {
                  "locale": "es",
                  "content": "Search"
              },
              {
                  "locale": "ne",
                  "content": "Search"
              },
              {
                  "locale": "sw",
                  "content": "Search"
              }
          ]
      },
      {
          "key": "pending",
          "default": "Pending Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Pending Timestamp"
              }
          ]
      },
      {
          "key": "scheduled",
          "default": "Scheduled Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Scheduled Timestamp"
              }
          ]
      },
      {
          "key": "received",
          "default": "Received Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Received Timestamp"
              }
          ]
      },
      {
          "key": "sent",
          "default": "Sent Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Sent Timestamp"
              }
          ]
      },
      {
          "key": "cleared",
          "default": "Cleared Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Cleared Timestamp"
              }
          ]
      },
      {
          "key": "muted",
          "default": "Muted Timestamp",
          "translations": [
              {
                  "locale": "en",
                  "content": "Muted Timestamp"
              }
          ]
      },
      {
          "key": "task.type",
          "default": "Message Type",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message Type"
              }
          ]
      },
      {
          "key": "task.state",
          "default": "Message State",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message State"
              }
          ]
      },
      {
          "key": "Reply",
          "default": "Reply",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reply"
              }
          ]
      },
      {
          "key": "Verify",
          "default": "Verify",
          "translations": [
              {
                  "locale": "en",
                  "content": "Verify"
              }
          ]
      },
      {
          "key": "Unverify",
          "default": "Unverify",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unverify"
              }
          ]
      },
      {
          "key": "Delete",
          "default": "Delete",
          "translations": [
              {
                  "locale": "en",
                  "content": "Delete"
              }
          ]
      },
      {
          "key": "Edit",
          "default": "Edit",
          "translations": [
              {
                  "locale": "en",
                  "content": "Edit"
              }
          ]
      },
      {
          "key": "Send Message",
          "default": "Send Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send Message"
              }
          ]
      },
      {
          "key": "Submit Report",
          "default": "Submit Report",
          "translations": [
              {
                  "locale": "en",
                  "content": "Submit Report"
              }
          ]
      },
      {
          "key": "Easy Setup Wizard",
          "default": "Easy Setup Wizard",
          "translations": [
              {
                  "locale": "en",
                  "content": "Easy Setup Wizard"
              }
          ]
      },
      {
          "key": "Guided Tour",
          "default": "Guided Tour",
          "translations": [
              {
                  "locale": "en",
                  "content": "Guided Tour"
              }
          ]
      },
      {
          "key": "Edit User Profile",
          "default": "Edit User Profile",
          "translations": [
              {
                  "locale": "en",
                  "content": "Edit User Profile"
              }
          ]
      },
      {
          "key": "Configuration",
          "default": "Configuration",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configuration"
              }
          ]
      },
      {
          "key": "Report Bug",
          "default": "Report Bug",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Bug"
              }
          ]
      },
      {
          "key": "Log Out",
          "default": "Log Out",
          "translations": [
              {
                  "locale": "en",
                  "content": "Log Out"
              }
          ]
      },
      {
          "key": "Messages",
          "default": "Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Messages"
              }
          ]
      },
      {
          "key": "Reports",
          "default": "Reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reports"
              }
          ]
      },
      {
          "key": "Analytics",
          "default": "Analytics",
          "translations": [
              {
                  "locale": "en",
                  "content": "Analytics"
              }
          ]
      },
      {
          "key": "Back",
          "default": "Back",
          "translations": [
              {
                  "locale": "en",
                  "content": "Back"
              }
          ]
      },
      {
          "key": "All facilities",
          "default": "All facilities",
          "translations": [
              {
                  "locale": "en",
                  "content": "All facilities"
              }
          ]
      },
      {
          "key": "Number of facilities",
          "default": "{{number}} facilities",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{number}} facilities"
              }
          ]
      },
      {
          "key": "All form types",
          "default": "All form types",
          "translations": [
              {
                  "locale": "en",
                  "content": "All form types"
              }
          ]
      },
      {
          "key": "Number of form types",
          "default": "{{number}} form types",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{number}} form types"
              }
          ]
      },
      {
          "key": "Any date",
          "default": "Any date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Any date"
              }
          ]
      },
      {
          "key": "Validity",
          "default": "Validity",
          "translations": [
              {
                  "locale": "en",
                  "content": "Validity"
              }
          ]
      },
      {
          "key": "Valid",
          "default": "Valid",
          "translations": [
              {
                  "locale": "en",
                  "content": "Valid"
              }
          ]
      },
      {
          "key": "Invalid",
          "default": "Invalid",
          "translations": [
              {
                  "locale": "en",
                  "content": "Invalid"
              }
          ]
      },
      {
          "key": "Verification",
          "default": "Verification",
          "translations": [
              {
                  "locale": "en",
                  "content": "Verification"
              }
          ]
      },
      {
          "key": "Verified",
          "default": "Verified",
          "translations": [
              {
                  "locale": "en",
                  "content": "Verified"
              }
          ]
      },
      {
          "key": "Unverified",
          "default": "Unverified",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unverified"
              }
          ]
      },
      {
          "key": "Extra search words",
          "default": "Extra search words",
          "translations": [
              {
                  "locale": "en",
                  "content": "Extra search words"
              }
          ]
      },
      {
          "key": "Clear all filters",
          "default": "Clear all filters",
          "translations": [
              {
                  "locale": "en",
                  "content": "Clear all filters"
              }
          ]
      },
      {
          "key": "Error fetching messages",
          "default": "Error fetching messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error fetching messages"
              }
          ]
      },
      {
          "key": "No messages found",
          "default": "No messages found",
          "translations": [
              {
                  "locale": "en",
                  "content": "No messages found"
              }
          ]
      },
      {
          "key": "No more messages",
          "default": "No more messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "No more messages"
              }
          ]
      },
      {
          "key": "Unread below",
          "default": "Unread below",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unread below"
              }
          ]
      },
      {
          "key": "Enter message",
          "default": "Enter message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Enter message"
              }
          ]
      },
      {
          "key": "Sending",
          "default": "Sending...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Sending..."
              }
          ]
      },
      {
          "key": "Send",
          "default": "Send",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send"
              }
          ]
      },
      {
          "key": "autoreply",
          "default": "autoreply",
          "translations": [
              {
                  "locale": "en",
                  "content": "autoreply"
              }
          ]
      },
      {
          "key": "state.pending",
          "default": "pending",
          "translations": [
              {
                  "locale": "en",
                  "content": "pending"
              }
          ]
      },
      {
          "key": "state.received",
          "default": "received",
          "translations": [
              {
                  "locale": "en",
                  "content": "received"
              }
          ]
      },
      {
          "key": "state.muted",
          "default": "muted",
          "translations": [
              {
                  "locale": "en",
                  "content": "muted"
              }
          ]
      },
      {
          "key": "state.cleared",
          "default": "cleared",
          "translations": [
              {
                  "locale": "en",
                  "content": "cleared"
              }
          ]
      },
      {
          "key": "state.sent",
          "default": "sent",
          "translations": [
              {
                  "locale": "en",
                  "content": "sent"
              }
          ]
      },
      {
          "key": "state.scheduled",
          "default": "scheduled",
          "translations": [
              {
                  "locale": "en",
                  "content": "scheduled"
              }
          ]
      },
      {
          "key": "select all",
          "default": "select all",
          "translations": [
              {
                  "locale": "en",
                  "content": "select all"
              }
          ]
      },
      {
          "key": "clear",
          "default": "clear",
          "translations": [
              {
                  "locale": "en",
                  "content": "clear"
              }
          ]
      },
      {
          "key": "Cancel",
          "default": "Cancel",
          "translations": [
              {
                  "locale": "en",
                  "content": "Cancel"
              }
          ]
      },
      {
          "key": "Apply",
          "default": "Apply",
          "translations": [
              {
                  "locale": "en",
                  "content": "Apply"
              }
          ]
      },
      {
          "key": "date.from",
          "default": "From",
          "translations": [
              {
                  "locale": "en",
                  "content": "From"
              }
          ]
      },
      {
          "key": "date.to",
          "default": "To",
          "translations": [
              {
                  "locale": "en",
                  "content": "To"
              }
          ]
      },
      {
          "key": "No reports found",
          "default": "No reports found",
          "translations": [
              {
                  "locale": "en",
                  "content": "No reports found"
              }
          ]
      },
      {
          "key": "No more reports",
          "default": "No more reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "No more reports"
              }
          ]
      },
      {
          "key": "Error fetching reports",
          "default": "Error fetching reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error fetching reports"
              }
          ]
      },
      {
          "key": "invalid.query",
          "default": "That query is invalid. Read our advanced search help page for more information on query syntax.",
          "translations": [
              {
                  "locale": "en",
                  "content": "That query is invalid. Read our advanced search help page for more information on query syntax."
              }
          ]
      },
      {
          "key": "Help",
          "default": "Help",
          "translations": [
              {
                  "locale": "en",
                  "content": "Help"
              }
          ]
      },
      {
          "key": "Content",
          "default": "Content",
          "translations": [
              {
                  "locale": "en",
                  "content": "Content"
              }
          ]
      },
      {
          "key": "Errors",
          "default": "Errors",
          "translations": [
              {
                  "locale": "en",
                  "content": "Errors"
              }
          ]
      },
      {
          "key": "Automated Reply",
          "default": "Automated Reply",
          "translations": [
              {
                  "locale": "en",
                  "content": "Automated Reply"
              }
          ]
      },
      {
          "key": "Automated Reply",
          "default": "Automated Reply",
          "translations": [
              {
                  "locale": "en",
                  "content": "Automated Reply"
              }
          ]
      },
      {
          "key": "Automated Reply",
          "default": "Automated Reply",
          "translations": [
              {
                  "locale": "en",
                  "content": "Automated Reply"
              }
          ]
      },
      {
          "key": "Mute",
          "default": "Mute",
          "translations": [
              {
                  "locale": "en",
                  "content": "Mute"
              }
          ]
      },
      {
          "key": "Schedule",
          "default": "Schedule",
          "translations": [
              {
                  "locale": "en",
                  "content": "Schedule"
              }
          ]
      },
      {
          "key": "Add Message",
          "default": "Add Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Add Message"
              }
          ]
      },
      {
          "key": "Submit",
          "default": "Submit",
          "translations": [
              {
                  "locale": "en",
                  "content": "Submit"
              }
          ]
      },
      {
          "key": "Confirm",
          "default": "Confirm",
          "translations": [
              {
                  "locale": "en",
                  "content": "Confirm"
              }
          ]
      },
      {
          "key": "confirm.delete",
          "default": "Are you sure you want to delete this message?",
          "translations": [
              {
                  "locale": "en",
                  "content": "Are you sure you want to delete this message?"
              }
          ]
      },
      {
          "key": "Full Name",
          "default": "Full Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Full Name"
              }
          ]
      },
      {
          "key": "Email Address",
          "default": "E-mail Address",
          "translations": [
              {
                  "locale": "en",
                  "content": "E-mail Address"
              }
          ]
      },
      {
          "key": "Language",
          "default": "Language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Language"
              }
          ]
      },
      {
          "key": "Phone Number",
          "default": "Phone number",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone number"
              },
              {
                  "locale": "fr",
                  "content": "Téléphone"
              },
              {
                  "locale": "es",
                  "content": "Teléfono"
              },
              {
                  "locale": "ne",
                  "content": "सम्पर्क टेलिफोन"
              },
              {
                  "locale": "sw",
                  "content": "Namba ya Simu"
              }
          ]
      },
      {
          "key": "Bug description",
          "default": "Bug description",
          "translations": [
              {
                  "locale": "en",
                  "content": "Bug description"
              }
          ]
      },
      {
          "key": "Update Facility",
          "default": "Update Facility",
          "translations": [
              {
                  "locale": "en",
                  "content": "Update Facility"
              }
          ]
      },
      {
          "key": "Start",
          "default": "Start",
          "translations": [
              {
                  "locale": "en",
                  "content": "Start"
              }
          ]
      },
      {
          "key": "welcome",
          "default": "Hello {{name}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "Hello {{name}}"
              }
          ]
      },
      {
          "key": "welcome.description",
          "default": "You can access the guided tour or the easy setup wizard from the settings icon in the upper right.",
          "translations": [
              {
                  "locale": "en",
                  "content": "You can access the guided tour or the easy setup wizard from the settings icon in the upper right."
              }
          ]
      },
      {
          "key": "tour.select",
          "default": "Select Tour",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select Tour"
              }
          ]
      },
      {
          "key": "tour.select.description",
          "default": "You can start a tour at any time by clicking the cog in the top right corner. Which tour would you like to run?",
          "translations": [
              {
                  "locale": "en",
                  "content": "You can start a tour at any time by clicking the cog in the top right corner. Which tour would you like to run?"
              }
          ]
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
