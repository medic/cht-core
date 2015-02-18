
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
   "locale_outgoing": "en",
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
                  "content": "Kutoka kwa"
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
                  "content": "Mfanyakazi wa Afya ya Jamii"
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
                  "content": "Wafanyakazi wa Afya ya Jamii"
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
                  "content": "Mji"
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
                  "content": "Jina"
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
                  "content": "Nambari ya simu"
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
                  "content": "Kodi"
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
                  "content": "Vituo vya Afya"
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
                  "content": "Kituo cha Afya"
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
                  "content": "Jina la Kituo cha Afya"
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
                  "content": "Jina la mawasiliano"
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
                  "content": "Nambari ya simu"
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
                  "content": "Wilaya"
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
                  "content": "Wilaya"
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
                  "content": "Jina la Wilaya"
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
                  "content": "Jina la Mawasiliano"
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
                  "content": "Nambari ya simu"
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
                  "locale": "sw",
                  "content": "Kuuza nje"
              }
          ]
      },
      {
          "key": "Import",
          "default": "Import",
          "translations": [
              {
                  "locale": "en",
                  "content": "Import"
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
                  "content": "Établissement"
              },
              {
                  "locale": "es",
                  "content": "Institución"
              },
              {
                  "locale": "sw",
                  "content": "Vituo"
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
                  "content": "Analyse des rapports envoyés"
              },
              {
                  "locale": "es",
                  "content": "Análisis de los reportes enviados"
              },
              {
                  "locale": "sw",
                  "content": "Viwango vya Kufanya Ripoti"
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
                  "content": "Le récipient du message n'a pas été trouvé."
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
                  "content": "Mpokezi wa ujumbe hapatikani."
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
                  "content": "Mahali pa kuandikia si halali au hapayuko"
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
                  "content": "Mahali pa kuandikia si halali au hapayuko"
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
                  "content": "Champs additionnels."
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
                  "content": "Mahali ziada pa kunadikia"
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
                  "content": "Fomu '{{form}}' haipatikani."
              }
          ]
      },
      {
          "key": "form_not_found",
          "default": "The form sent was not recognized. Please complete it again and resend. If this problem persists contact your supervisor.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The form sent was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
              },
              {
                  "locale": "fr",
                  "content": "Le formulaire envoyé n'est pas reconnu, SVP corriger et renvoyer. Si ce problème persiste contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "No se reconocio el reporte enviado. Por favor intente de nuevo. Si el problema persiste, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "फारम मिलेन​। कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": "Fomu iliyowasilishwa haitambuliki. Tafadhali kamilisha na utume tena. Hitilafu hii ikiendelea muarifu msimamizi wako."
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
                  "content": "Fomu iliyowasilishwa '{{form}}' haikukamilishwa ipasavyo. Tafadhali kamilisha na utume tena. Hitilafu hii ikiendelea muarifu msimamizi wako."
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
                  "content": "Fomu iliyowasilishwa '{{form}}' haikukamilishwa ipasavyo. Tafadhali kamilisha na utume tena. Hitilafu hii ikiendelea muarifu msimamizi wako."
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
                  "content": "Kituo cha afya hakipatikani."
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
                  "content": "Le message reçu est vide."
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
                  "content": "Ujumbe unaonekana kama ni mtupu."
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
                  "content": "Nous avons reçu un message vide. SVP réessayer et si vous continuez à avoir des problèmes contactez votre superviseur."
              },
              {
                  "locale": "es",
                  "content": "El mensaje esta en blanco, por favor reenvielo. Si continúa teniendo problemas, informe al director."
              },
              {
                  "locale": "ne",
                  "content": "सन्देश​ खाली छ​ । कृपया फेरि प्रयास गर्नुहोला।"
              },
              {
                  "locale": "sw",
                  "content": "Yaonekana kama umetuma ujumbe mtupu, tafadhali jaribu kutuma tena. Ukiendelea kupata hitilafu hii tafadhali muarifu msimamizi wako."
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
                  "content": "Fomu uliyowasilisha imepokewa, asante."
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
                  "content": "Merci, votre message a été bien reçu. Si vous étiez en train d'envoyer un rapport réessayez avec le bon code du rapport."
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
                  "content": "Ujumbe umepokewa; utasomwa hivi punde. Kama ulikuwa unajaribu kuwasilisha ujumbe wa muundo maalum, tafadhali weka kodi sahihi ya fomu na ujaribu tena."
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
                  "content": "ID ya kitengo kinachoripoti si sahihi. Tafadhali rekebisha na uwasilishe fomu kamilifu tena."
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
                  "content": "Identification du patient"
              },
              {
                  "locale": "es",
                  "content": "Identificación del paciente"
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
                  "content": "Tarehe ya kuripoti."
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
                  "content": "Nom de la clinique"
              },
              {
                  "locale": "es",
                  "content": "Nombre de la clínica"
              },
              {
                  "locale": "ne",
                  "content": ""
              },
              {
                  "locale": "sw",
                  "content": "Jina la Kliniki"
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
                  "content": "Nom du contact à la clinique"
              },
              {
                  "locale": "es",
                  "content": "Nombre de Contacto en la Clínica"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Mawasiliano la Kliniki"
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
                  "content": "Nombre del Centro de Salud"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Kituo cha Afya"
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
                  "content": "Nom du contact au centre de santé"
              },
              {
                  "locale": "es",
                  "content": "Nombre de Contacto en el Centro de Salud"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Mawasiliano la Kituo cha Afya"
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
                  "content": "Nombre Hospital de Distrito"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Hospitali ya Wilaya"
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
                  "content": "Nombre del Centro de Salud"
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्थाको नाम​"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Kituo cha Afya"
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
                  "content": "Nom du contact au centre de santé"
              },
              {
                  "locale": "es",
                  "content": "Nombre de Contacto en el Centro de Salud"
              },
              {
                  "locale": "ne",
                  "content": "स्वास्थ्य संस्थाको सम्पर्क व्यक्ति"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Mawasiliano la Kituo cha Afya"
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
                  "content": "Nombre Hospital de Distrito"
              },
              {
                  "locale": "ne",
                  "content": "जिल्ला अस्पतालको नाम"
              },
              {
                  "locale": "sw",
                  "content": "Jina la Hospitali ya Wilaya"
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
                  "content": "Statut"
              },
              {
                  "locale": "es",
                  "content": "Estado"
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
                  "content": "À"
              },
              {
                  "locale": "es",
                  "content": "A"
              },
              {
                  "locale": "ne",
                  "content": "पाउने"
              },
              {
                  "locale": "sw",
                  "content": "Kwa"
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
                  "content": "Mensaje"
              },
              {
                  "locale": "ne",
                  "content": "सन्देश"
              },
              {
                  "locale": "sw",
                  "content": "Ujumbe"
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
                  "content": "Tukoka kwa"
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
                  "content": "Tarehe"
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
                  "content": "Días desde la visita del paciente"
              },
              {
                  "locale": "ne",
                  "content": "बिरामीलाई भेटेको कति दिन भयो?​"
              },
              {
                  "locale": "sw",
                  "content": "Siku tangu kuhudhuria kwa mhudumiwa"
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
                  "content": "Identification du patient"
              },
              {
                  "locale": "es",
                  "content": "Identificación del paciente"
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
                  "content": "Réponses"
              },
              {
                  "locale": "es",
                  "content": "Respuestas"
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
                  "content": "Messages entrants"
              },
              {
                  "locale": "es",
                  "content": "Mensajes entrantes"
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
                  "content": "Messages sortants"
              },
              {
                  "locale": "es",
                  "content": "Mensajes salientes"
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
                  "content": "Messages prévus"
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
                  "content": "Recherche"
              },
              {
                  "locale": "es",
                  "content": "Buscar"
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
          "key": "Deleting",
          "default": "Deleting...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Deleting..."
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
          "key": "Schedule name",
          "default": "Schedule: {{name}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "Schedule: {{name}}"
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
          "key": "confirm.delete.user",
          "default": "Are you sure you want to delete this user? This operation cannot be undone.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Are you sure you want to delete this user? This operation cannot be undone."
              }
          ]
      },
      {
          "key": "Full Name",
          "default": "Full name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Full name"
              }
          ]
      },
      {
          "key": "Email Address",
          "default": "E-mail address",
          "translations": [
              {
                  "locale": "en",
                  "content": "E-mail address"
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
          "default": "Hello {{fullname}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "Hello {{fullname}}"
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
          "key": "setup.modem.title",
          "default": "Modem setup",
          "translations": [
              {
                  "locale": "en",
                  "content": "Modem setup"
              }
          ]
      },
      {
          "key": "setup.modem.subtitle",
          "default": "You will need a USB GSM modem with an active SIM card to send and receive text messages.",
          "translations": [
              {
                  "locale": "en",
                  "content": "You will need a USB GSM modem with an active SIM card to send and receive text messages."
              }
          ]
      },
      {
          "key": "setup.contact.title",
          "default": "Identify care coordinators",
          "translations": [
              {
                  "locale": "en",
                  "content": "Identify care coordinators"
              }
          ]
      },
      {
          "key": "setup.contact.subtitle",
          "default": "Select who will be registering and tracking pregnancies in your community.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select who will be registering and tracking pregnancies in your community."
              }
          ]
      },
      {
          "key": "setup.contact.description",
          "default": "They will need a mobile phone with a texting plan.",
          "translations": [
              {
                  "locale": "en",
                  "content": "They will need a mobile phone with a texting plan."
              }
          ]
      },
      {
          "key": "setup.contact.help",
          "default": "If you don't know what to choose, refer to the ANC user guide.",
          "translations": [
              {
                  "locale": "en",
                  "content": "If you don't know what to choose, refer to the ANC user guide."
              }
          ]
      },
      {
          "key": "setup.language.title",
          "default": "Language preference",
          "translations": [
              {
                  "locale": "en",
                  "content": "Language preference"
              }
          ]
      },
      {
          "key": "setup.language.subtitle",
          "default": "Select the language that users logging in to the website will be using.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select the language that users logging in to the website will be using."
              }
          ]
      },
      {
          "key": "setup.language.outgoing.subtitle",
          "default": "Select the language that your primary point of contact will be using.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select the language that your primary point of contact will be using."
              }
          ]
      },
      {
          "key": "setup.language.description",
          "default": "If you don't see your language, you can always add a custom language from Administrative Settings.",
          "translations": [
              {
                  "locale": "en",
                  "content": "If you don't see your language, you can always add a custom language from Administrative Settings."
              }
          ]
      },
      {
          "key": "setup.registration.title",
          "default": "Registration form",
          "translations": [
              {
                  "locale": "en",
                  "content": "Registration form"
              }
          ]
      },
      {
          "key": "setup.registration.subtitle",
          "default": "Will your primary point of contact for registration be able to report using Last Menstrual Period (LMP).",
          "translations": [
              {
                  "locale": "en",
                  "content": "Will your primary point of contact for registration be able to report using Last Menstrual Period (LMP)."
              }
          ]
      },
      {
          "key": "setup.registration.description",
          "default": "Women in some cultures may not want to share this information.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Women in some cultures may not want to share this information."
              }
          ]
      },
      {
          "key": "setup.registration.help",
          "default": "If you don't know what to choose, refer to the ANC user guide.",
          "translations": [
              {
                  "locale": "en",
                  "content": "If you don't know what to choose, refer to the ANC user guide."
              }
          ]
      },
      {
          "key": "setup.statistics.title",
          "default": "Anonymous statistics submission",
          "translations": [
              {
                  "locale": "en",
                  "content": "Anonymous statistics submission"
              }
          ]
      },
      {
          "key": "setup.statistics.subtitle",
          "default": "Allow anonymous usage statistics to be submitted back to Medic Mobile.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Allow anonymous usage statistics to be submitted back to Medic Mobile."
              }
          ]
      },
      {
          "key": "setup.statistics.description",
          "default": "These statistics will be used to help us understand how to improve the software.",
          "translations": [
              {
                  "locale": "en",
                  "content": "These statistics will be used to help us understand how to improve the software."
              }
          ]
      },
      {
          "key": "setup.skip",
          "default": "Skip the setup wizard",
          "translations": [
              {
                  "locale": "en",
                  "content": "Skip the setup wizard"
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
      },
      {
          "key": "Gateway number",
          "default": "Gateway number",
          "translations": [
              {
                  "locale": "en",
                  "content": "Gateway number"
              }
          ]
      },
      {
          "key": "Gateway number help",
          "default": "This is number where mobile reporters should send their reports. It is also the number they will receive messages from.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This is number where mobile reporters should send their reports. It is also the number they will receive messages from."
              }
          ]
      },
      {
          "key": "Default country code",
          "default": "Default country code",
          "translations": [
              {
                  "locale": "en",
                  "content": "Default country code"
              }
          ]
      },
      {
          "key": "Default country code help",
          "default": "Messages without a country code will be assigned this country code.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Messages without a country code will be assigned this country code."
              }
          ]
      },
      {
          "key": "Pregnant patient",
          "default": "The pregnant patient",
          "translations": [
              {
                  "locale": "en",
                  "content": "The pregnant patient"
              }
          ]
      },
      {
          "key": "Facility nurse",
          "default": "Facility nurse",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facility nurse"
              }
          ]
      },
      {
          "key": "Last Menstrual Period",
          "default": "Last Menstrual Period (LMP)",
          "translations": [
              {
                  "locale": "en",
                  "content": "Last Menstrual Period (LMP)"
              }
          ]
      },
      {
          "key": "With",
          "default": "With",
          "translations": [
              {
                  "locale": "en",
                  "content": "With"
              }
          ]
      },
      {
          "key": "Without",
          "default": "Without",
          "translations": [
              {
                  "locale": "en",
                  "content": "Without"
              }
          ]
      },
      {
          "key": "Error saving settings",
          "default": "There was an error saving your settings, please try again.",
          "translations": [
              {
                  "locale": "en",
                  "content": "There was an error saving your settings, please try again."
              }
          ]
      },
      {
          "key": "Generated report field",
          "default": "Generated report field",
          "translations": [
              {
                  "locale": "en",
                  "content": "Generated report field"
              }
          ]
      },
      {
          "key": "birth_date",
          "default": "Birth Date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Birth Date"
              }
          ]
      },
      {
          "key": "mother_outcome",
          "default": "Mother Outcome",
          "translations": [
              {
                  "locale": "en",
                  "content": "Mother Outcome"
              }
          ]
      },
      {
          "key": "child_birth_outcome",
          "default": "Child Birth Outcome",
          "translations": [
              {
                  "locale": "en",
                  "content": "Child Birth Outcome"
              }
          ]
      },
      {
          "key": "child_birth_weight",
          "default": "Child Birth Weight",
          "translations": [
              {
                  "locale": "en",
                  "content": "Child Birth Weight"
              }
          ]
      },
      {
          "key": "child_birth_date",
          "default": "Child Birth Date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Child Birth Date"
              }
          ]
      },
      {
          "key": "expected_date",
          "default": "Expected Date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Expected Date"
              }
          ]
      },
      {
          "key": "Any status",
          "default": "Any status",
          "translations": [
              {
                  "locale": "en",
                  "content": "Any status"
              }
          ]
      },
      {
          "key": "Patient Name",
          "default": "Patient Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Patient Name"
              }
          ]
      },
      {
          "key": "Weeks Pregnant",
          "default": "Weeks Pregnant",
          "translations": [
              {
                  "locale": "en",
                  "content": "Weeks Pregnant"
              }
          ]
      },
      {
          "key": "Visits",
          "default": "Visits",
          "translations": [
              {
                  "locale": "en",
                  "content": "Visits"
              }
          ]
      },
      {
          "key": "contact.short",
          "default": "CHW",
          "translations": [
              {
                  "locale": "en",
                  "content": "CHW"
              }
          ]
      },
      {
          "key": "EDD",
          "default": "EDD",
          "translations": [
              {
                  "locale": "en",
                  "content": "EDD"
              }
          ]
      },
      {
          "key": "Appointment Date",
          "default": "Appointment Date",
          "translations": [
              {
                  "locale": "en",
                  "content": "Appointment Date"
              }
          ]
      },
      {
          "key": "Patient History",
          "default": "Patient History",
          "translations": [
              {
                  "locale": "en",
                  "content": "Patient History"
              }
          ]
      },
      {
          "key": "Last Appointment",
          "default": "Last Appointment",
          "translations": [
              {
                  "locale": "en",
                  "content": "Last Appointment"
              }
          ]
      },
      {
          "key": "analytics.unconfigured",
          "default": "No analytics modules are configured.",
          "translations": [
              {
                  "locale": "en",
                  "content": "No analytics modules are configured."
              }
          ]
      },
      {
          "key": "analytics.connection.error",
          "default": "Could not retrieve data at this time.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Could not retrieve data at this time."
              }
          ]
      },
      {
          "key": "analytics.anc.active-pregnancies",
          "default": "Active Pregnancies",
          "translations": [
              {
                  "locale": "en",
                  "content": "Active Pregnancies"
              }
          ]
      },
      {
          "key": "analytics.anc.delivery-locations",
          "default": "Reported Delivery Locations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reported Delivery Locations"
              }
          ]
      },
      {
          "key": "analytics.anc.high-risk",
          "default": "High Risk Pregnancies",
          "translations": [
              {
                  "locale": "en",
                  "content": "High Risk Pregnancies"
              }
          ]
      },
      {
          "key": "analytics.anc.missed-appointments",
          "default": "Recent Missed Appointments",
          "translations": [
              {
                  "locale": "en",
                  "content": "Recent Missed Appointments"
              }
          ]
      },
      {
          "key": "analytics.anc.missing-reports",
          "default": "Missing Birth Reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "Missing Birth Reports"
              }
          ]
      },
      {
          "key": "analytics.anc.monthly-births",
          "default": "Monthly Births",
          "translations": [
              {
                  "locale": "en",
                  "content": "Monthly Births"
              }
          ]
      },
      {
          "key": "analytics.anc.monthly-registrations",
          "default": "Monthly Pregnancies Registered",
          "translations": [
              {
                  "locale": "en",
                  "content": "Monthly Pregnancies Registered"
              }
          ]
      },
      {
          "key": "analytics.anc.total-births",
          "default": "Total Births",
          "translations": [
              {
                  "locale": "en",
                  "content": "Total Births"
              }
          ]
      },
      {
          "key": "analytics.anc.upcoming-appointments",
          "default": "Upcoming Appointments",
          "translations": [
              {
                  "locale": "en",
                  "content": "Upcoming Appointments"
              }
          ]
      },
      {
          "key": "analytics.anc.upcoming-edds",
          "default": "Women With Upcoming EDDs",
          "translations": [
              {
                  "locale": "en",
                  "content": "Women With Upcoming EDDs"
              }
          ]
      },
      {
          "key": "analytics.anc.visits-completed",
          "default": "Visits Completed During Pregnancy",
          "translations": [
              {
                  "locale": "en",
                  "content": "Visits Completed During Pregnancy"
              }
          ]
      },
      {
          "key": "analytics.anc.visits-completed.description",
          "default": "Completed pregnancies that have had...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Completed pregnancies that have had..."
              }
          ]
      },
      {
          "key": "analytics.anc.visits-during",
          "default": "Visits Completed So Far",
          "translations": [
              {
                  "locale": "en",
                  "content": "Visits Completed So Far"
              }
          ]
      },
      {
          "key": "analytics.anc.visits-during.description",
          "default": "Active pregnancies that have had...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Active pregnancies that have had..."
              }
          ]
      },
      {
          "key": "Previous",
          "default": "Prev",
          "translations": [
              {
                  "locale": "en",
                  "content": "Prev"
              }
          ]
      },
      {
          "key": "Next",
          "default": "Next",
          "translations": [
              {
                  "locale": "en",
                  "content": "Next"
              }
          ]
      },
      {
          "key": "End tour",
          "default": "End tour",
          "translations": [
              {
                  "locale": "en",
                  "content": "End tour"
              }
          ]
      },
      {
          "key": "tour.messages.unstructured.title",
          "default": "Unstructured Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unstructured Messages"
              }
          ]
      },
      {
          "key": "tour.messages.unstructured.description",
          "default": "Here you can communicate with patients, community health workers, and community members to schedule trainings, ask and respond to questions, and provide additional information — just like regular SMS. You can also send bulk messages to groups of people.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Here you can communicate with patients, community health workers, and community members to schedule trainings, ask and respond to questions, and provide additional information — just like regular SMS. You can also send bulk messages to groups of people."
              }
          ]
      },
      {
          "key": "tour.messages.list.title",
          "default": "Message Contacts List",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message Contacts List"
              }
          ]
      },
      {
          "key": "tour.messages.list.description",
          "default": "This is a list of all your message contacts with the most recent one on top. The light blue highlight indicates which message is being displayed on the right. If the name is bold it means you haven't read one or more messages with this contact.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This is a list of all your message contacts with the most recent one on top. The light blue highlight indicates which message is being displayed on the right. If the name is bold it means you haven't read one or more messages with this contact."
              }
          ]
      },
      {
          "key": "tour.messages.exchange.title",
          "default": "Message Exchange",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message Exchange"
              }
          ]
      },
      {
          "key": "tour.messages.exchange.description",
          "default": "This pane shows the exchange of messages from the selected health worker or phone number on the left.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This pane shows the exchange of messages from the selected health worker or phone number on the left."
              }
          ]
      },
      {
          "key": "tour.messages.contact.title",
          "default": "Contact's Information",
          "translations": [
              {
                  "locale": "en",
                  "content": "Contact's Information"
              }
          ]
      },
      {
          "key": "tour.messages.contact.description",
          "default": "This bar contains the contact's name and phone number on the left, and their location on the right.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This bar contains the contact's name and phone number on the left, and their location on the right."
              }
          ]
      },
      {
          "key": "tour.messages.outgoing.title",
          "default": "Outgoing Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Outgoing Messages"
              }
          ]
      },
      {
          "key": "tour.messages.outgoing.description",
          "default": "The blue border indicates an outgoing message sent by you, another user, or an automated message from Medic Mobile.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The blue border indicates an outgoing message sent by you, another user, or an automated message from Medic Mobile."
              }
          ]
      },
      {
          "key": "tour.messages.incoming.title",
          "default": "Incoming Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Incoming Messages"
              }
          ]
      },
      {
          "key": "tour.messages.incoming.description",
          "default": "The yellow border indicates an incoming message sent by the selected contact.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The yellow border indicates an incoming message sent by the selected contact."
              }
          ]
      },
      {
          "key": "tour.messages.send.title",
          "default": "Send Message To Contact",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send Message To Contact"
              }
          ]
      },
      {
          "key": "tour.messages.send.description",
          "default": "Use this box to quickly send an SMS message to the contact.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Use this box to quickly send an SMS message to the contact."
              }
          ]
      },
      {
          "key": "tour.reports.forms.title",
          "default": "Report Forms",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Forms"
              }
          ]
      },
      {
          "key": "tour.reports.forms.description",
          "default": "All of the reports submitted by community health workers live here. Depending on how you are using Medic Mobile in your community, these reports may be for pregnancy registrations, completed visits, or stock outs.",
          "translations": [
              {
                  "locale": "en",
                  "content": "All of the reports submitted by community health workers live here. Depending on how you are using Medic Mobile in your community, these reports may be for pregnancy registrations, completed visits, or stock outs."
              }
          ]
      },
      {
          "key": "tour.reports.types-filter.title",
          "default": "Form Types Filter",
          "translations": [
              {
                  "locale": "en",
                  "content": "Form Types Filter"
              }
          ]
      },
      {
          "key": "tour.reports.types-filter.description",
          "default": "Select one or more form types to filter the list of reports to only those for the chosen forms.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select one or more form types to filter the list of reports to only those for the chosen forms."
              }
          ]
      },
      {
          "key": "tour.reports.facilities-filter.title",
          "default": "Facilities Filter",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facilities Filter"
              }
          ]
      },
      {
          "key": "tour.reports.facilities-filter.description",
          "default": "Select one or more facilities to filter the list of reports to only those from the chosen facilities.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select one or more facilities to filter the list of reports to only those from the chosen facilities."
              }
          ]
      },
      {
          "key": "tour.reports.date-filter.title",
          "default": "Date Range Filter",
          "translations": [
              {
                  "locale": "en",
                  "content": "Date Range Filter"
              }
          ]
      },
      {
          "key": "tour.reports.date-filter.description",
          "default": "To view reports within a specified date range, select a start and ending date.",
          "translations": [
              {
                  "locale": "en",
                  "content": "To view reports within a specified date range, select a start and ending date."
              }
          ]
      },
      {
          "key": "tour.reports.status-filter.title",
          "default": "Status Filter",
          "translations": [
              {
                  "locale": "en",
                  "content": "Status Filter"
              }
          ]
      },
      {
          "key": "tour.reports.status-filter.description",
          "default": "To filter by validity or verification, select one or more options.",
          "translations": [
              {
                  "locale": "en",
                  "content": "To filter by validity or verification, select one or more options."
              }
          ]
      },
      {
          "key": "tour.reports.freetext-filter.title",
          "default": "Freetext Filter",
          "translations": [
              {
                  "locale": "en",
                  "content": "Freetext Filter"
              }
          ]
      },
      {
          "key": "tour.reports.freetext-filter.description",
          "default": "To add additional search terms type them here and click the search button.",
          "translations": [
              {
                  "locale": "en",
                  "content": "To add additional search terms type them here and click the search button."
              }
          ]
      },
      {
          "key": "tour.reports.list.title",
          "default": "Incoming Reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "Incoming Reports"
              }
          ]
      },
      {
          "key": "tour.reports.list.description",
          "default": "This is a list of all your report messages from health workers with the most recent first.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This is a list of all your report messages from health workers with the most recent first."
              }
          ]
      },
      {
          "key": "tour.reports.status.title",
          "default": "Report Status",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Status"
              }
          ]
      },
      {
          "key": "tour.reports.status.description",
          "default": "This icon shows the status of the report. A green circle means the report is valid, and red means invalid. A tick in the circle means someone has verified this report.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This icon shows the status of the report. A green circle means the report is valid, and red means invalid. A tick in the circle means someone has verified this report."
              }
          ]
      },
      {
          "key": "tour.reports.details.title",
          "default": "Report Details",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Details"
              }
          ]
      },
      {
          "key": "tour.reports.details.description",
          "default": "You can see the details of the selected report in this pane.",
          "translations": [
              {
                  "locale": "en",
                  "content": "You can see the details of the selected report in this pane."
              }
          ]
      },
      {
          "key": "tour.reports.information.title",
          "default": "Report Information",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Information"
              }
          ]
      },
      {
          "key": "tour.reports.information.description",
          "default": "On the left hand side is the reporter's details. On the right hand side is the reported date.",
          "translations": [
              {
                  "locale": "en",
                  "content": "On the left hand side is the reporter's details. On the right hand side is the reported date."
              }
          ]
      },
      {
          "key": "tour.reports.content.title",
          "default": "Report Content",
          "translations": [
              {
                  "locale": "en",
                  "content": "Report Content"
              }
          ]
      },
      {
          "key": "tour.reports.content.description",
          "default": "The content of the report including the form type, submitted fields, generated fields, and any generated messages.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The content of the report including the form type, submitted fields, generated fields, and any generated messages."
              }
          ]
      },
      {
          "key": "tour.reports.actions.title",
          "default": "Actions",
          "translations": [
              {
                  "locale": "en",
                  "content": "Actions"
              }
          ]
      },
      {
          "key": "tour.reports.actions.description",
          "default": "Actions you can perform on this report.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Actions you can perform on this report."
              }
          ]
      },
      {
          "key": "tour.analytics.overview.title",
          "default": "Data Visualization Analytics",
          "translations": [
              {
                  "locale": "en",
                  "content": "Data Visualization Analytics"
              }
          ]
      },
      {
          "key": "tour.analytics.overview.description",
          "default": "Medic Mobile organizes the data from your reports into charts and graphs to help you track pregnancies, monitor danger signs, and identify trends in your community - so you can make well-informed decisions and take action when it is needed.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Medic Mobile organizes the data from your reports into charts and graphs to help you track pregnancies, monitor danger signs, and identify trends in your community - so you can make well-informed decisions and take action when it is needed."
              }
          ]
      },
      {
          "key": "tour.admin.configuration.title",
          "default": "Settings Configuration",
          "translations": [
              {
                  "locale": "en",
                  "content": "Settings Configuration"
              }
          ]
      },
      {
          "key": "tour.admin.configuration.description",
          "default": "Here you can customize settings including translations, forms, and other general settings.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Here you can customize settings including translations, forms, and other general settings."
              }
          ]
      },
      {
          "key": "tour.admin.settings.title",
          "default": "Settings",
          "translations": [
              {
                  "locale": "en",
                  "content": "Settings"
              }
          ]
      },
      {
          "key": "tour.admin.settings.description",
          "default": "General configuration settings.",
          "translations": [
              {
                  "locale": "en",
                  "content": "General configuration settings."
              }
          ]
      },
      {
          "key": "tour.admin.translations.title",
          "default": "Translations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Translations"
              }
          ]
      },
      {
          "key": "tour.admin.translations.description",
          "default": "Configure the translation values.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configure the translation values."
              }
          ]
      },
      {
          "key": "tour.admin.forms.title",
          "default": "Forms",
          "translations": [
              {
                  "locale": "en",
                  "content": "Forms"
              }
          ]
      },
      {
          "key": "tour.admin.forms.description",
          "default": "Import and export the available forms.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Import and export the available forms."
              }
          ]
      },
      {
          "key": "tour.admin.advanced.title",
          "default": "Advanced",
          "translations": [
              {
                  "locale": "en",
                  "content": "Advanced"
              }
          ]
      },
      {
          "key": "tour.admin.advanced.description",
          "default": "Advanced settings and update application.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Advanced settings and update application."
              }
          ]
      },
      {
          "key": "tour.admin.schedules.title",
          "default": "Schedules Configuration",
          "translations": [
              {
                  "locale": "en",
                  "content": "Schedules Configuration"
              }
          ]
      },
      {
          "key": "tour.admin.schedules.description",
          "default": "Configure the messages that will be generated when a patient is registered.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configure the messages that will be generated when a patient is registered."
              }
          ]
      },
      {
          "key": "tour.admin.export.title",
          "default": "Export",
          "translations": [
              {
                  "locale": "en",
                  "content": "Export"
              }
          ]
      },
      {
          "key": "tour.admin.export.description",
          "default": "Export messages, reports, or the audit log. The exports are divided into specific districts and can be filtered by date.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Export messages, reports, or the audit log. The exports are divided into specific districts and can be filtered by date."
              }
          ]
      },
      {
          "key": "tour.admin.user.title",
          "default": "User Management",
          "translations": [
              {
                  "locale": "en",
                  "content": "User Management"
              }
          ]
      },
      {
          "key": "tour.admin.user.description",
          "default": "Here you can create, edit, or delete users.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Here you can create, edit, or delete users."
              }
          ]
      },
      {
          "key": "tour.admin.facilities.title",
          "default": "Facilities and Health Workers",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facilities and Health Workers"
              }
          ]
      },
      {
          "key": "tour.admin.facilities.description",
          "default": "Here is where you manage your facilities and field workers.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Here is where you manage your facilities and field workers."
              }
          ]
      },
      {
          "key": "Institutional Delivery",
          "default": "Institutional Delivery",
          "translations": [
              {
                  "locale": "en",
                  "content": "Institutional Delivery"
              }
          ]
      },
      {
          "key": "At home with SBA",
          "default": "At home with SBA",
          "translations": [
              {
                  "locale": "en",
                  "content": "At home with SBA"
              }
          ]
      },
      {
          "key": "At home without SBA",
          "default": "At home without SBA",
          "translations": [
              {
                  "locale": "en",
                  "content": "At home without SBA"
              }
          ]
      },
      {
          "key": "Number of visits",
          "default": "{{number}}+ visits",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{number}}+ visits"
              }
          ]
      },
      {
          "key": "Error sending message",
          "default": "Error sending message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error sending message"
              }
          ]
      },
      {
          "key": "Error updating user",
          "default": "Error updating user",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error updating user"
              }
          ]
      },
      {
          "key": "Error deleting document",
          "default": "Error deleting document",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error deleting document"
              }
          ]
      },
      {
          "key": "Error updating facility",
          "default": "Error updating facility",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error updating facility"
              }
          ]
      },
      {
          "key": "Please select a facility",
          "default": "Please select a facility",
          "translations": [
              {
                  "locale": "en",
                  "content": "Please select a facility"
              }
          ]
      },
      {
          "key": "Error saving feedback",
          "default": "Error saving feedback",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error saving feedback"
              }
          ]
      },
      {
          "key": "Error updating group",
          "default": "Error updating group",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error updating group"
              }
          ]
      },
      {
          "key": "Antenatal Care",
          "default": "Antenatal Care",
          "translations": [
              {
                  "locale": "en",
                  "content": "Antenatal Care"
              }
          ]
      },
      {
          "key": "Stock Monitoring",
          "default": "Stock Monitoring",
          "translations": [
              {
                  "locale": "en",
                  "content": "Stock Monitoring"
              }
          ]
      },
      {
          "key": "Number in month",
          "default": "{{count}} in {{month}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{count}} in {{month}}"
              }
          ]
      },
      {
          "key": "Schedules",
          "default": "Schedules",
          "translations": [
              {
                  "locale": "en",
                  "content": "Schedules"
              }
          ]
      },
      {
          "key": "Users",
          "default": "Users",
          "translations": [
              {
                  "locale": "en",
                  "content": "Users"
              }
          ]
      },
      {
          "key": "Settings",
          "default": "Settings",
          "translations": [
              {
                  "locale": "en",
                  "content": "Settings"
              }
          ]
      },
      {
          "key": "Translations",
          "default": "Translations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Translations"
              }
          ]
      },
      {
          "key": "Forms",
          "default": "Forms",
          "translations": [
              {
                  "locale": "en",
                  "content": "Forms"
              }
          ]
      },
      {
          "key": "Advanced",
          "default": "Advanced",
          "translations": [
              {
                  "locale": "en",
                  "content": "Advanced"
              }
          ]
      },
      {
          "key": "Basic",
          "default": "Basic",
          "translations": [
              {
                  "locale": "en",
                  "content": "Basic"
              }
          ]
      },
      {
          "key": "External ID",
          "default": "External ID",
          "translations": [
              {
                  "locale": "en",
                  "content": "External ID"
              }
          ]
      },
      {
          "key": "Districts",
          "default": "Districts",
          "translations": [
              {
                  "locale": "en",
                  "content": "Districts"
              }
          ]
      },
      {
          "key": "Accept plain-text messages",
          "default": "Accept plain-text messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Accept plain-text messages"
              }
          ]
      },
      {
          "key": "Accept plain-text messages help",
          "default": "Check this box if you want to accept regular SMS messages in addition to reports. If unchecked, an error message will be sent to anyone who submits anything other than a report.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Check this box if you want to accept regular SMS messages in addition to reports. If unchecked, an error message will be sent to anyone who submits anything other than a report."
              }
          ]
      },
      {
          "key": "Date display format",
          "default": "Date display format",
          "translations": [
              {
                  "locale": "en",
                  "content": "Date display format"
              }
          ]
      },
      {
          "key": "Datetime display format",
          "default": "Datetime display format",
          "translations": [
              {
                  "locale": "en",
                  "content": "Datetime display format"
              }
          ]
      },
      {
          "key": "For example",
          "default": "Eg:",
          "translations": [
              {
                  "locale": "en",
                  "content": "Eg:"
              }
          ]
      },
      {
          "key": "Phone number conversion",
          "default": "Phone number conversion",
          "translations": [
              {
                  "locale": "en",
                  "content": "Phone number conversion"
              }
          ]
      },
      {
          "key": "Replace country code for",
          "default": "Replace country code for",
          "translations": [
              {
                  "locale": "en",
                  "content": "Replace country code for"
              }
          ]
      },
      {
          "key": "Messaging window",
          "default": "Messaging window",
          "translations": [
              {
                  "locale": "en",
                  "content": "Messaging window"
              }
          ]
      },
      {
          "key": "Send scheduled messages between",
          "default": "Send scheduled messages between",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send scheduled messages between"
              }
          ]
      },
      {
          "key": "and",
          "default": "and",
          "translations": [
              {
                  "locale": "en",
                  "content": "and"
              }
          ]
      },
      {
          "key": "Upload Forms",
          "default": "Upload Forms",
          "translations": [
              {
                  "locale": "en",
                  "content": "Upload Forms"
              }
          ]
      },
      {
          "key": "Upload failed",
          "default": "Upload failed",
          "translations": [
              {
                  "locale": "en",
                  "content": "Upload failed"
              }
          ]
      },
      {
          "key": "Upload succeeded",
          "default": "Upload succeeded",
          "translations": [
              {
                  "locale": "en",
                  "content": "Upload succeeded"
              }
          ]
      },
      {
          "key": "Installed Forms",
          "default": "Installed Forms",
          "translations": [
              {
                  "locale": "en",
                  "content": "Installed Forms"
              }
          ]
      },
      {
          "key": "Choose file",
          "default": "Choose file",
          "translations": [
              {
                  "locale": "en",
                  "content": "Choose file"
              }
          ]
      },
      {
          "key": "Upload forms help",
          "default": "The file should contain a JSON encoded list of form definitions. Any existing forms will be overwritten.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The file should contain a JSON encoded list of form definitions. Any existing forms will be overwritten."
              }
          ]
      },
      {
          "key": "Advanced settings intro",
          "default": "To check for and install newer versions of Medic Mobile or to adjust technical settings use the",
          "translations": [
              {
                  "locale": "en",
                  "content": "To check for and install newer versions of Medic Mobile or to adjust technical settings use the"
              }
          ]
      },
      {
          "key": "Advanced settings outro",
          "default": "This is intended for users with a highly technical background.",
          "translations": [
              {
                  "locale": "en",
                  "content": "This is intended for users with a highly technical background."
              }
          ]
      },
      {
          "key": "Dashboard settings page",
          "default": "Dashboard settings page",
          "translations": [
              {
                  "locale": "en",
                  "content": "Dashboard settings page"
              }
          ]
      },
      {
          "key": "Download",
          "default": "Download",
          "translations": [
              {
                  "locale": "en",
                  "content": "Download"
              }
          ]
      },
      {
          "key": "No schedules found",
          "default": "No schedules found",
          "translations": [
              {
                  "locale": "en",
                  "content": "No schedules found"
              }
          ]
      },
      {
          "key": "Overview",
          "default": "Overview",
          "translations": [
              {
                  "locale": "en",
                  "content": "Overview"
              }
          ]
      },
      {
          "key": "Incoming Reports",
          "default": "Incoming Reports",
          "translations": [
              {
                  "locale": "en",
                  "content": "Incoming Reports"
              }
          ]
      },
      {
          "key": "Unsaved changes",
          "default": "Unsaved changes",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unsaved changes"
              }
          ]
      },
      {
          "key": "Discard changes to current language",
          "default": "Would you like to continue and discard changes made to the current language?",
          "translations": [
              {
                  "locale": "en",
                  "content": "Would you like to continue and discard changes made to the current language?"
              }
          ]
      },
      {
          "key": "Continue",
          "default": "Continue",
          "translations": [
              {
                  "locale": "en",
                  "content": "Continue"
              }
          ]
      },
      {
          "key": "Registrations",
          "default": "Registrations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Registrations"
              }
          ]
      },
      {
          "key": "Registration format",
          "default": "Register for this message workflow by sending an SMS with the following format:",
          "translations": [
              {
                  "locale": "en",
                  "content": "Register for this message workflow by sending an SMS with the following format:"
              }
          ]
      },
      {
          "key": "Registration example",
          "default": "For example, to register \"{{name}}\" you would send:",
          "translations": [
              {
                  "locale": "en",
                  "content": "For example, to register \"{{name}}\" you would send:"
              }
          ]
      },
      {
          "key": "Validation message",
          "default": "If all the validations pass, this message will be sent to the sender:",
          "translations": [
              {
                  "locale": "en",
                  "content": "If all the validations pass, this message will be sent to the sender:"
              }
          ]
      },
      {
          "key": "No registrations found",
          "default": "No registrations found for this schedule. This indicates a problem with the configuration.",
          "translations": [
              {
                  "locale": "en",
                  "content": "No registrations found for this schedule. This indicates a problem with the configuration."
              }
          ]
      },
      {
          "key": "No forms found",
          "default": "No forms found for this schedule.",
          "translations": [
              {
                  "locale": "en",
                  "content": "No forms found for this schedule."
              }
          ]
      },
      {
          "key": "Report format",
          "default": "Recorded by sending an SMS in the format:",
          "translations": [
              {
                  "locale": "en",
                  "content": "Recorded by sending an SMS in the format:"
              }
          ]
      },
      {
          "key": "Language to edit",
          "default": "Language to edit",
          "translations": [
              {
                  "locale": "en",
                  "content": "Language to edit"
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
          "key": "Start messages based on",
          "default": "Start messages based on",
          "translations": [
              {
                  "locale": "en",
                  "content": "Start messages based on"
              }
          ]
      },
      {
          "key": "Exactly",
          "default": "Exactly",
          "translations": [
              {
                  "locale": "en",
                  "content": "Exactly"
              }
          ]
      },
      {
          "key": "On the day",
          "default": "On the {{day}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "On the {{day}}"
              }
          ]
      },
      {
          "key": "minutes",
          "default": "minutes",
          "translations": [
              {
                  "locale": "en",
                  "content": "minutes"
              }
          ]
      },
      {
          "key": "hours",
          "default": "hours",
          "translations": [
              {
                  "locale": "en",
                  "content": "hours"
              }
          ]
      },
      {
          "key": "days",
          "default": "days",
          "translations": [
              {
                  "locale": "en",
                  "content": "days"
              }
          ]
      },
      {
          "key": "weeks",
          "default": "weeks",
          "translations": [
              {
                  "locale": "en",
                  "content": "weeks"
              }
          ]
      },
      {
          "key": "months",
          "default": "months",
          "translations": [
              {
                  "locale": "en",
                  "content": "months"
              }
          ]
      },
      {
          "key": "years",
          "default": "years",
          "translations": [
              {
                  "locale": "en",
                  "content": "years"
              }
          ]
      },
      {
          "key": "after the",
          "default": "after the",
          "translations": [
              {
                  "locale": "en",
                  "content": "after the"
              }
          ]
      },
      {
          "key": "send the following message to the",
          "default": "send the following message to the",
          "translations": [
              {
                  "locale": "en",
                  "content": "send the following message to the"
              }
          ]
      },
      {
          "key": "registration date",
          "default": "registration date",
          "translations": [
              {
                  "locale": "en",
                  "content": "registration date"
              }
          ]
      },
      {
          "key": "LMP date",
          "default": "LMP date",
          "translations": [
              {
                  "locale": "en",
                  "content": "LMP date"
              }
          ]
      },
      {
          "key": "registrant",
          "default": "registrant",
          "translations": [
              {
                  "locale": "en",
                  "content": "registrant"
              }
          ]
      },
      {
          "key": "registrants supervisor",
          "default": "registrant's supervisor",
          "translations": [
              {
                  "locale": "en",
                  "content": "registrant's supervisor"
              }
          ]
      },
      {
          "key": "This message is part of group",
          "default": "This message is part of group",
          "translations": [
              {
                  "locale": "en",
                  "content": "This message is part of group"
              }
          ]
      },
      {
          "key": "and should be sent at",
          "default": "and should be sent at",
          "translations": [
              {
                  "locale": "en",
                  "content": "and should be sent at"
              }
          ]
      },
      {
          "key": "Validations",
          "default": "Validations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Validations"
              }
          ]
      },
      {
          "key": "Add Validation",
          "default": "Add Validation",
          "translations": [
              {
                  "locale": "en",
                  "content": "Add Validation"
              }
          ]
      },
      {
          "key": "patient id not found response",
          "default": "Send the following response message if the validations pass but the patient ID is not located.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send the following response message if the validations pass but the patient ID is not located."
              }
          ]
      },
      {
          "key": "failed validation response message",
          "default": "Send the following response message if the",
          "translations": [
              {
                  "locale": "en",
                  "content": "Send the following response message if the"
              }
          ]
      },
      {
          "key": "field does not pass this validation",
          "default": "field does not pass this validation",
          "translations": [
              {
                  "locale": "en",
                  "content": "field does not pass this validation"
              }
          ]
      },
      {
          "key": "Audit Logs",
          "default": "Audit Logs",
          "translations": [
              {
                  "locale": "en",
                  "content": "Audit Logs"
              }
          ]
      },
      {
          "key": "User Feedback",
          "default": "User Feedback",
          "translations": [
              {
                  "locale": "en",
                  "content": "User Feedback"
              }
          ]
      },
      {
          "key": "Showing number of total",
          "default": "Showing {{number}} of {{total}}.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Showing {{number}} of {{total}}."
              }
          ]
      },
      {
          "key": "number records",
          "default": "{{number}} records",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{number}} records"
              }
          ]
      },
      {
          "key": "No district",
          "default": "No district",
          "translations": [
              {
                  "locale": "en",
                  "content": "No district"
              }
          ]
      },
      {
          "key": "Backup",
          "default": "Backup",
          "translations": [
              {
                  "locale": "en",
                  "content": "Backup"
              }
          ]
      },
      {
          "key": "Restore",
          "default": "Restore",
          "translations": [
              {
                  "locale": "en",
                  "content": "Restore"
              }
          ]
      },
      {
          "key": "Overwrite Existing Records",
          "default": "Overwrite Existing Records",
          "translations": [
              {
                  "locale": "en",
                  "content": "Overwrite Existing Records"
              }
          ]
      },
      {
          "key": "Choose File",
          "default": "Choose File",
          "translations": [
              {
                  "locale": "en",
                  "content": "Choose File"
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.addrow",
          "default": "Add row",
          "translations": [
              {
                  "locale": "en",
                  "content": "Add row"
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.help.doubleclick",
          "default": "Double click: or enter key to edit a cell.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Double click: or enter key to edit a cell."
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.help.enter",
          "default": "Enter: key to save.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Enter: key to save."
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.help.escape",
          "default": "Escape: key for undo.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Escape: key for undo."
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.help.tab",
          "default": "Tab: cycles through cells.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Tab: cycles through cells."
              }
          ]
      },
      {
          "key": "jquery.spreadsheet.rows",
          "default": "rows",
          "translations": [
              {
                  "locale": "en",
                  "content": "rows"
              }
          ]
      },
      {
          "key": "Add User",
          "default": "Add User",
          "translations": [
              {
                  "locale": "en",
                  "content": "Add User"
              }
          ]
      },
      {
          "key": "Edit User",
          "default": "Edit User",
          "translations": [
              {
                  "locale": "en",
                  "content": "Edit User"
              }
          ]
      },
      {
          "key": "User Name",
          "default": "User name",
          "translations": [
              {
                  "locale": "en",
                  "content": "User name"
              }
          ]
      },
      {
          "key": "User Type",
          "default": "User type",
          "translations": [
              {
                  "locale": "en",
                  "content": "User type"
              }
          ]
      },
      {
          "key": "Facility",
          "default": "Facility",
          "translations": [
              {
                  "locale": "en",
                  "content": "Facility"
              }
          ]
      },
      {
          "key": "Password",
          "default": "Password",
          "translations": [
              {
                  "locale": "en",
                  "content": "Password"
              }
          ]
      },
      {
          "key": "Confirm Password",
          "default": "Confirm password",
          "translations": [
              {
                  "locale": "en",
                  "content": "Confirm password"
              }
          ]
      },
      {
          "key": "usertype.people",
          "default": "People",
          "translations": [
              {
                  "locale": "en",
                  "content": "People"
              }
          ]
      },
      {
          "key": "usertype.computers",
          "default": "Computers",
          "translations": [
              {
                  "locale": "en",
                  "content": "Computers"
              }
          ]
      },
      {
          "key": "usertype.national-manager",
          "default": "Full access",
          "translations": [
              {
                  "locale": "en",
                  "content": "Full access"
              }
          ]
      },
      {
          "key": "usertype.district-manager",
          "default": "Restricted to group of facilities",
          "translations": [
              {
                  "locale": "en",
                  "content": "Restricted to group of facilities"
              }
          ]
      },
      {
          "key": "usertype.data-entry",
          "default": "Data entry - access to Medic Reporter only",
          "translations": [
              {
                  "locale": "en",
                  "content": "Data entry - access to Medic Reporter only"
              }
          ]
      },
      {
          "key": "usertype.analytics",
          "default": "Analytics - Data export via URL only",
          "translations": [
              {
                  "locale": "en",
                  "content": "Analytics - Data export via URL only"
              }
          ]
      },
      {
          "key": "usertype.gateway",
          "default": "Gateway - Limited access user for SMSSync",
          "translations": [
              {
                  "locale": "en",
                  "content": "Gateway - Limited access user for SMSSync"
              }
          ]
      },
      {
          "key": "usertype.admin",
          "default": "Administrator",
          "translations": [
              {
                  "locale": "en",
                  "content": "Administrator"
              }
          ]
      },
      {
          "key": "usertype.unknown",
          "default": "Unknown",
          "translations": [
              {
                  "locale": "en",
                  "content": "Unknown"
              }
          ]
      },
      {
          "key": "Select a type",
          "default": "Select a type",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select a type"
              }
          ]
      },
      {
          "key": "Select a facility",
          "default": "Select a facility",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select a facility"
              }
          ]
      },
      {
          "key": "Select a language",
          "default": "Select a language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select a language"
              }
          ]
      },
      {
          "key": "field is required",
          "default": "{{field}} is a required field.",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{field}} is a required field."
              }
          ]
      },
      {
          "key": "Passwords must match",
          "default": "Passwords must match.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Passwords must match."
              }
          ]
      },
      {
          "key": "Confirm delete",
          "default": "Are you sure you want to delete {{name}}? This operation cannot be undone.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Are you sure you want to delete {{name}}? This operation cannot be undone."
              }
          ]
      },
      {
          "key": "Available Fields",
          "default": "Available Fields",
          "translations": [
              {
                  "locale": "en",
                  "content": "Available Fields"
              }
          ]
      },
      {
          "key": "help.search.title",
          "default": "Freetext Search",
          "translations": [
              {
                  "locale": "en",
                  "content": "Freetext Search"
              }
          ]
      },
      {
          "key": "help.search.description",
          "default": "<h4>Terms</h4> <p> A query is broken up into terms and operators. There are two types of terms: Single Terms and Phrases. A Single Term is a single word such as \"test\" or \"hello\". A Phrase is a group of words surrounded by double quotes such as \"hello dolly\". Multiple terms can be combined together with Boolean operators to form a more complex query.</p> <p>When performing a search you can either specify a field by typing a field name followed by a colon \":\" and then the term you are looking for, or use the default fields. The default fields are: patient_id, patient_name, caregiver_name and caregiver_phone, so if you do not specify a field name these will be used. If you would like the default search fields to change please send in a support request.</p> <h4>Fields</h4> <p>When performing a search you can either specify a field, or use the default field.</p> <p>You can search any field by typing the field name followed by a colon \":\" and then the term you are looking for.</p> <p>As an example, let's assume a Lucene index contains two fields, title and text and text is the default field. If you want to find the document entitled \"The Right Way\" which contains the text \"don't go this way\", you can enter:</p> <pre>title:\"The Right Way\" AND text:go</pre> <p>or</p> <pre>title:\"Do it right\" AND right</pre> <p>Since text is the default field, the field indicator is not required.</p> <p>Note: The field is only valid for the term that it directly precedes, so the query</p> <pre>title:Do it right</pre> <p>Will only find \"Do\" in the title field. It will find \"it\" and \"right\" in the default field (in this case the text field).</p> <p>You can search any field by typing the field name followed by a colon \":\" and then the term you are looking for.</p> <h4>Wildcard Searches</h4> <p>Lucene supports single and multiple character wildcard searches within single terms (not within phrase queries).</p> <p>To perform a single character wildcard search use the \"?\" symbol.</p> <p>To perform a multiple character wildcard search use the \"*\" symbol.</p> <p>The single character wildcard search looks for terms that match that with the single character replaced. For example, to search for \"text\" or \"test\" you can use the search:</p> <pre>te?t</pre> <p>Multiple character wildcard searches looks for 0 or more characters. For example, to search for test, tests or tester, you can use the search:</p> <pre>test*</pre> <p>You can also use the wildcard searches in the middle of a term.</p> <pre>te*t</pre> <p>Note: You cannot use a * or ? symbol as the first character of a search.</p> <h4>Range Searches</h4> <p>Range Queries allow one to match documents whose field(s) values are between the lower and upper bound specified by the Range Query. Range Queries can be inclusive or exclusive of the upper and lower bounds. Sorting is done lexicographically.</p> <pre>title:{Aida TO Carmen}</pre> <p>This will find all documents whose titles are between Aida and Carmen, but not including Aida and Carmen.</p> <p>Inclusive range queries are denoted by square brackets. Exclusive range queries are denoted by curly brackets.</p> <h5>Date Range Searches</h5> <p>When searching dates you need to include a strict syntax:</p> <pre>reported_date&lt;date&gt;:[2002-01-01 TO 2003-01-01]</pre> <p>This will find documents whose reported_date fields have values between 2002-01-01 and 2003-01-01, inclusive.</p> <h5>Integer Range Searches</h5> <p>When searching integers you need to include a strict syntax:</p> <pre>last_menstrual_period&lt;int&gt;:[10 TO 12]</pre> <p>This will find documents whose last_menstrual_period fields have values between 10 and 12, inclusive.</p> <h4>Boolean Operators</h4> <p>Boolean operators allow terms to be combined through logic operators. Lucene supports AND, \"+\", OR, NOT and \"-\" as Boolean operators(Note: Boolean operators must be ALL CAPS).</p> <p>The OR operator is the default conjunction operator. This means that if there is no Boolean operator between two terms, the OR operator is used. The OR operator links two terms and finds a matching document if either of the terms exist in a document. The symbol || can be used in place of the word OR.</p> <p>To search for documents that contain either \"jakarta apache\" or just \"jakarta\" use the query:</p> <pre>\"jakarta apache\" jakarta</pre> <p>or</p> <pre>\"jakarta apache\" OR jakarta</pre> <h5>AND</h5> <p>The AND operator matches documents where both terms exist anywhere in the text of a single document. This is equivalent to an intersection using sets. The symbol &amp;&amp; can be used in place of the word AND.</p> <p>To search for documents that contain \"jakarta apache\" and \"Apache Lucene\" use the query: </p> <pre>\"jakarta apache\" AND \"Apache Lucene\"</pre> <h5>+</h5> <p>The \"+\" or required operator requires that the term after the \"+\" symbol exist somewhere in the field of a single document.</p> <p>To search for documents that must contain \"jakarta\" and may contain \"lucene\" use the query:</p> <pre>+jakarta lucene</pre> <h5>NOT</h5> <p>The NOT operator excludes documents that contain the term after NOT. This is equivalent to a difference using sets. The symbol ! can be used in place of the word NOT.</p> <p>To search for documents that contain \"jakarta apache\" but not \"Apache Lucene\" use the query: </p> <pre class=\"code\">\"jakarta apache\" NOT \"Apache Lucene\"</pre> <p>Note: The NOT operator cannot be used with just one term. For example, the following search will return no results:</p> <pre class=\"code\">NOT \"jakarta apache\"</pre> <h5>-</h5> <p>The \"-\" or prohibit operator excludes documents that contain the term after the \"-\" symbol.</p> <p>To search for documents that contain \"jakarta apache\" but not \"Apache Lucene\" use the query: </p> <pre class=\"code\">\"jakarta apache\" -\"Apache Lucene\"</pre>",
          "translations": [
              {
                  "locale": "en",
                  "content": "<h4>Terms</h4> <p> A query is broken up into terms and operators. There are two types of terms: Single Terms and Phrases. A Single Term is a single word such as \"test\" or \"hello\". A Phrase is a group of words surrounded by double quotes such as \"hello dolly\". Multiple terms can be combined together with Boolean operators to form a more complex query.</p> <p>When performing a search you can either specify a field by typing a field name followed by a colon \":\" and then the term you are looking for, or use the default fields. The default fields are: patient_id, patient_name, caregiver_name and caregiver_phone, so if you do not specify a field name these will be used. If you would like the default search fields to change please send in a support request.</p> <h4>Fields</h4> <p>When performing a search you can either specify a field, or use the default field.</p> <p>You can search any field by typing the field name followed by a colon \":\" and then the term you are looking for.</p> <p>As an example, let's assume a Lucene index contains two fields, title and text and text is the default field. If you want to find the document entitled \"The Right Way\" which contains the text \"don't go this way\", you can enter:</p> <pre>title:\"The Right Way\" AND text:go</pre> <p>or</p> <pre>title:\"Do it right\" AND right</pre> <p>Since text is the default field, the field indicator is not required.</p> <p>Note: The field is only valid for the term that it directly precedes, so the query</p> <pre>title:Do it right</pre> <p>Will only find \"Do\" in the title field. It will find \"it\" and \"right\" in the default field (in this case the text field).</p> <p>You can search any field by typing the field name followed by a colon \":\" and then the term you are looking for.</p> <h4>Wildcard Searches</h4> <p>Lucene supports single and multiple character wildcard searches within single terms (not within phrase queries).</p> <p>To perform a single character wildcard search use the \"?\" symbol.</p> <p>To perform a multiple character wildcard search use the \"*\" symbol.</p> <p>The single character wildcard search looks for terms that match that with the single character replaced. For example, to search for \"text\" or \"test\" you can use the search:</p> <pre>te?t</pre> <p>Multiple character wildcard searches looks for 0 or more characters. For example, to search for test, tests or tester, you can use the search:</p> <pre>test*</pre> <p>You can also use the wildcard searches in the middle of a term.</p> <pre>te*t</pre> <p>Note: You cannot use a * or ? symbol as the first character of a search.</p> <h4>Range Searches</h4> <p>Range Queries allow one to match documents whose field(s) values are between the lower and upper bound specified by the Range Query. Range Queries can be inclusive or exclusive of the upper and lower bounds. Sorting is done lexicographically.</p> <pre>title:{Aida TO Carmen}</pre> <p>This will find all documents whose titles are between Aida and Carmen, but not including Aida and Carmen.</p> <p>Inclusive range queries are denoted by square brackets. Exclusive range queries are denoted by curly brackets.</p> <h5>Date Range Searches</h5> <p>When searching dates you need to include a strict syntax:</p> <pre>reported_date&lt;date&gt;:[2002-01-01 TO 2003-01-01]</pre> <p>This will find documents whose reported_date fields have values between 2002-01-01 and 2003-01-01, inclusive.</p> <h5>Integer Range Searches</h5> <p>When searching integers you need to include a strict syntax:</p> <pre>last_menstrual_period&lt;int&gt;:[10 TO 12]</pre> <p>This will find documents whose last_menstrual_period fields have values between 10 and 12, inclusive.</p> <h4>Boolean Operators</h4> <p>Boolean operators allow terms to be combined through logic operators. Lucene supports AND, \"+\", OR, NOT and \"-\" as Boolean operators(Note: Boolean operators must be ALL CAPS).</p> <p>The OR operator is the default conjunction operator. This means that if there is no Boolean operator between two terms, the OR operator is used. The OR operator links two terms and finds a matching document if either of the terms exist in a document. The symbol || can be used in place of the word OR.</p> <p>To search for documents that contain either \"jakarta apache\" or just \"jakarta\" use the query:</p> <pre>\"jakarta apache\" jakarta</pre> <p>or</p> <pre>\"jakarta apache\" OR jakarta</pre> <h5>AND</h5> <p>The AND operator matches documents where both terms exist anywhere in the text of a single document. This is equivalent to an intersection using sets. The symbol &amp;&amp; can be used in place of the word AND.</p> <p>To search for documents that contain \"jakarta apache\" and \"Apache Lucene\" use the query: </p> <pre>\"jakarta apache\" AND \"Apache Lucene\"</pre> <h5>+</h5> <p>The \"+\" or required operator requires that the term after the \"+\" symbol exist somewhere in the field of a single document.</p> <p>To search for documents that must contain \"jakarta\" and may contain \"lucene\" use the query:</p> <pre>+jakarta lucene</pre> <h5>NOT</h5> <p>The NOT operator excludes documents that contain the term after NOT. This is equivalent to a difference using sets. The symbol ! can be used in place of the word NOT.</p> <p>To search for documents that contain \"jakarta apache\" but not \"Apache Lucene\" use the query: </p> <pre class=\"code\">\"jakarta apache\" NOT \"Apache Lucene\"</pre> <p>Note: The NOT operator cannot be used with just one term. For example, the following search will return no results:</p> <pre class=\"code\">NOT \"jakarta apache\"</pre> <h5>-</h5> <p>The \"-\" or prohibit operator excludes documents that contain the term after the \"-\" symbol.</p> <p>To search for documents that contain \"jakarta apache\" but not \"Apache Lucene\" use the query: </p> <pre class=\"code\">\"jakarta apache\" -\"Apache Lucene\"</pre>"
              }
          ]
      },
      {
          "key": "help.validation.title",
          "default": "Configuration of validation rules",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configuration of validation rules"
              }
          ]
      },
      {
          "key": "help.validation.description",
          "default": "<h4>Rules</h4> <p>Validation rules are code fragments used to determine if some input is valid. For example, to say a field is only valid if the value has at least five characters, you would use the <span class=\"pre\">lenMin(5)</span>.</p> <h4>Operators</h4> <p>The available operators are:</p> <dl class=\"horizontal\"> <dt><span class=\"pre\">&amp;&amp;</span></dt> <dd>and</dd> <dt><span class=\"pre\">||</span></dt> <dd>or</dd> <dt><span class=\"pre\">!</span></dt> <dd>not</dd> <dt><span class=\"pre\">a ? b : c</span></dt> <dd>ternary, ie: if 'a' is true, then check 'b', otherwise check 'c'</dd> <dt><span class=\"pre\">()</span></dt> <dd>nested blocks, eg: 'a &amp;&amp; (b || c)'</dd> </dl> <h4>Functions</h4> <p>The available operators are:</p> <dl class=\"horizontal\"> <dt><span class=\"pre\">equals</span></dt> <dd>Comparison</dd> <dt><span class=\"pre\">iEquals</span></dt> <dd>Case insensitive comparison</dd> <dt><span class=\"pre\">sEquals</span></dt> <dd>Type sensitive equals</dd> <dt><span class=\"pre\">siEquals</span></dt> <dd>Type sensitive case insensitive equals</dd> <dt><span class=\"pre\">lenMin</span></dt> <dd>Minimum length</dd> <dt><span class=\"pre\">lenMax</span></dt> <dd>Maximum length</dd> <dt><span class=\"pre\">lenEquals</span></dt> <dd>Exact length</dd> <dt><span class=\"pre\">min</span></dt> <dd>Minimum value</dd> <dt><span class=\"pre\">max</span></dt> <dd>Maximum value</dd> <dt><span class=\"pre\">between</span></dt> <dd>Minimum and maximum value</dd> <dt><span class=\"pre\">in</span></dt> <dd>One of the provided values</dd> <dt><span class=\"pre\">required</span></dt> <dd>Must have a value</dd> <dt><span class=\"pre\">optional</span></dt> <dd>Always valid</dd> <dt><span class=\"pre\">numeric</span></dt> <dd>Numbers only</dd> <dt><span class=\"pre\">integer</span></dt> <dd>Integer numbers only</dd> <dt><span class=\"pre\">alpha</span></dt> <dd>Letters only</dd> <dt><span class=\"pre\">alphaNumeric</span></dt> <dd>Numbers and letters only</dd> <dt><span class=\"pre\">email</span></dt> <dd>Email address format</dd> <dt><span class=\"pre\">regex</span></dt> <dd>A custom regular expression</dd> <dt><span class=\"pre\">unique</span></dt> <dd>Used to specify one or more fields which must be unique, eg: \"unique('patient_id', 'lmp')\". To check uniqueness within a form type, include 'form' as a parameter, eg: \"unique('patient_id','form')\".</dd> <dt><span class=\"pre\">uniqueWithin</span></dt> <dd>Used to specify one or more fields which must be unique within a given time frame, eg: \"uniqueWithin('patient_id', 'name', '1 months')\"</dd> <dt><span class=\"pre\">exists</span></dt> <dd>Validates that the provided value matches an existing document, eg: \"exists('ANCR', 'patient_id')\"</dd> </dl>",
          "translations": [
              {
                  "locale": "en",
                  "content": "<h4>Rules</h4> <p>Validation rules are code fragments used to determine if some input is valid. For example, to say a field is only valid if the value has at least five characters, you would use the <span class=\"pre\">lenMin(5)</span>.</p> <h4>Operators</h4> <p>The available operators are:</p> <dl class=\"horizontal\"> <dt><span class=\"pre\">&amp;&amp;</span></dt> <dd>and</dd> <dt><span class=\"pre\">||</span></dt> <dd>or</dd> <dt><span class=\"pre\">!</span></dt> <dd>not</dd> <dt><span class=\"pre\">a ? b : c</span></dt> <dd>ternary, ie: if 'a' is true, then check 'b', otherwise check 'c'</dd> <dt><span class=\"pre\">()</span></dt> <dd>nested blocks, eg: 'a &amp;&amp; (b || c)'</dd> </dl> <h4>Functions</h4> <p>The available operators are:</p> <dl class=\"horizontal\"> <dt><span class=\"pre\">equals</span></dt> <dd>Comparison</dd> <dt><span class=\"pre\">iEquals</span></dt> <dd>Case insensitive comparison</dd> <dt><span class=\"pre\">sEquals</span></dt> <dd>Type sensitive equals</dd> <dt><span class=\"pre\">siEquals</span></dt> <dd>Type sensitive case insensitive equals</dd> <dt><span class=\"pre\">lenMin</span></dt> <dd>Minimum length</dd> <dt><span class=\"pre\">lenMax</span></dt> <dd>Maximum length</dd> <dt><span class=\"pre\">lenEquals</span></dt> <dd>Exact length</dd> <dt><span class=\"pre\">min</span></dt> <dd>Minimum value</dd> <dt><span class=\"pre\">max</span></dt> <dd>Maximum value</dd> <dt><span class=\"pre\">between</span></dt> <dd>Minimum and maximum value</dd> <dt><span class=\"pre\">in</span></dt> <dd>One of the provided values</dd> <dt><span class=\"pre\">required</span></dt> <dd>Must have a value</dd> <dt><span class=\"pre\">optional</span></dt> <dd>Always valid</dd> <dt><span class=\"pre\">numeric</span></dt> <dd>Numbers only</dd> <dt><span class=\"pre\">integer</span></dt> <dd>Integer numbers only</dd> <dt><span class=\"pre\">alpha</span></dt> <dd>Letters only</dd> <dt><span class=\"pre\">alphaNumeric</span></dt> <dd>Numbers and letters only</dd> <dt><span class=\"pre\">email</span></dt> <dd>Email address format</dd> <dt><span class=\"pre\">regex</span></dt> <dd>A custom regular expression</dd> <dt><span class=\"pre\">unique</span></dt> <dd>Used to specify one or more fields which must be unique, eg: \"unique('patient_id', 'lmp')\". To check uniqueness within a form type, include 'form' as a parameter, eg: \"unique('patient_id','form')\".</dd> <dt><span class=\"pre\">uniqueWithin</span></dt> <dd>Used to specify one or more fields which must be unique within a given time frame, eg: \"uniqueWithin('patient_id', 'name', '1 months')\"</dd> <dt><span class=\"pre\">exists</span></dt> <dd>Validates that the provided value matches an existing document, eg: \"exists('ANCR', 'patient_id')\"</dd> </dl>"
              }
          ]
      },
      {
          "key": "help.messages.title",
          "default": "Configuration of outgoing messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configuration of outgoing messages"
              }
          ]
      },
      {
          "key": "help.messages.description",
          "default": "<h4>Configuration</h4> <p>Outgoing messages can be configured to include data from the document by wrapping the field name in braces, eg:</p> <pre>Thank you \{\{contact.name\}\}, \{\{patient_name\}\} has been registered.</pre> <p><a href=\"http://mustache.github.io/mustache.5.html\" target=\"_blank\">More information</a>.</p> <h4>Available Fields</h4> <dl class=\"horizontal\"> <dt><span class=\"pre\">contact</span></dt> <dd>The contact at the clinic. Use contact.name or contact.phone.</dd> <dt><span class=\"pre\">clinic</span></dt> <dd>The clinic</dd> <dt><span class=\"pre\">parent</span></dt> <dd>The parent facility of the clinic</dd> <dt><span class=\"pre\">grandparent</span></dt> <dd>The grandparent facility of the clinic</dd> <dt><span class=\"pre\">health_center</span></dt> <dd>The health center</dd> <dt><span class=\"pre\">district</span></dt> <dd>The district</dd> <dt></dt> <dd>All other fields on the document are included</dd> </dl> <h4>Formatters</h4> <p>To format dates using the configured date format:</p> <pre>Expected due date is \{\{#date\}\}\{\{expected_date\}\}\{\{/date\}\}</pre> <p>Or the configured datetime format:</p> <pre>Message received at \{\{#datetime\}\}\{\{reported_date\}\}\{\{/datetime\}\}</pre>",
          "translations": [
              {
                  "locale": "en",
                  "content": "<h4>Configuration</h4> <p>Outgoing messages can be configured to include data from the document by wrapping the field name in braces, eg:</p> <pre>Thank you \{\{contact.name\}\}, \{\{patient_name\}\} has been registered.</pre> <p><a href=\"http://mustache.github.io/mustache.5.html\" target=\"_blank\">More information</a>.</p> <h4>Available Fields</h4> <dl class=\"horizontal\"> <dt><span class=\"pre\">contact</span></dt> <dd>The contact at the clinic. Use contact.name or contact.phone.</dd> <dt><span class=\"pre\">clinic</span></dt> <dd>The clinic</dd> <dt><span class=\"pre\">parent</span></dt> <dd>The parent facility of the clinic</dd> <dt><span class=\"pre\">grandparent</span></dt> <dd>The grandparent facility of the clinic</dd> <dt><span class=\"pre\">health_center</span></dt> <dd>The health center</dd> <dt><span class=\"pre\">district</span></dt> <dd>The district</dd> <dt></dt> <dd>All other fields on the document are included</dd> </dl> <h4>Formatters</h4> <p>To format dates using the configured date format:</p> <pre>Expected due date is \{\{#date\}\}\{\{expected_date\}\}\{\{/date\}\}</pre> <p>Or the configured datetime format:</p> <pre>Message received at \{\{#datetime\}\}\{\{reported_date\}\}\{\{/datetime\}\}</pre>"
              }
          ]
      },
      {
          "key": "help.export.title",
          "default": "Data export",
          "translations": [
              {
                  "locale": "en",
                  "content": "Data export"
              }
          ]
      },
      {
          "key": "help.export.description",
          "default": "<p>You can export data by making requests to specific URLs.</p> <h4>Forms</h4> <p>Export a file containing all submitted forms.</p> <pre>/api/v1/export/forms/{formcode}</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> <dt>columns</dt> <dd> <p>An orderered array of columns to export, eg:</p> <pre>[\"reported_date\",\"from\",\"related_entities.clinic.name\"]</pre> <p>Defaults to:</p> <pre>[\"_id\",\"patient_id\",\"reported_date\", \"from\", \"related_entities.clinic.contact.name\", \"related_entities.clinic.name\", \"related_entities.clinic.parent.contact.name\", \"related_entities.clinic.parent.name\", \"related_entities.clinic.parent.parent.name\"]</pre> <p>Available columns:</p> <ul> <li>_id</li> <li>patient_id</li> <li>reported_date</li> <li>from</li> <li>related_entities.clinic.name</li> <li>related_entities.clinic.external_id</li> <li>related_entities.clinic.contact.name</li> <li>related_entities.clinic.parent.name</li> <li>related_entities.clinic.parent.external_id</li> <li>related_entities.clinic.parent.contact.name</li> <li>related_entities.clinic.parent.parent.name</li> <li>related_entities.clinic.parent.parent.external_id</li> </ul> <p>All form fields will be included as columns at the end regardless of the value for this parameter.</p> </dd> </dl> <h4>Messages</h4> <p>Export a file containing all messages</p> <pre>/api/v1/export/messages</pre> <p>Examples:</p> <p>Return only rows that are scheduled to be sent in the next ten days.</p> <pre>/export/messages?filter_state=scheduled&amp;filter_state_to=10</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> <dt>columns</dt> <dd> <p>An orderered array of columns to export, eg:</p> <pre>[\"reported_date\",\"from\",\"related_entities.clinic.name\"]</pre> <p>Defaults to:</p> <pre>[\"_id\",\"patient_id\",\"reported_date\", \"from\", \"related_entities.clinic.contact.name\", \"related_entities.clinic.name\", \"related_entities.clinic.parent.contact.name\", \"related_entities.clinic.parent.name\", \"related_entities.clinic.parent.parent.name\",\"task.type\",\"task.state\",\"received\",\"scheduled\",\"pending\",\"sent\",\"cleared\",\"muted\"]</pre> <p>Available columns:</p> <ul> <li>_id</li> <li>patient_id</li> <li>reported_date</li> <li>from</li> <li>related_entities.clinic.name</li> <li>related_entities.clinic.external_id</li> <li>related_entities.clinic.contact.name</li> <li>related_entities.clinic.parent.name</li> <li>related_entities.clinic.parent.external_id</li> <li>related_entities.clinic.parent.contact.name</li> <li>related_entities.clinic.parent.parent.name</li> <li>related_entities.clinic.parent.parent.external_id</li> <li>task.type</li> <li>task.state</li> <li>received</li> <li>scheduled</li> <li>pending</li> <li>sent</li> <li>cleared</li> <li>muted</li> </ul> <p>Regardless of the value for this parameter, for each message the following four columns will be appended</p> <ul> <li>Message UUID</li> <li>Sent By</li> <li>To phone</li> <li>Message Body</li> </ul> </dd> <dt>filter_state</dt> <dd>Used in conjunction with the parameters below to only return messages that were in a given state. Possible values are 'received', 'scheduled', 'pending', 'sent', 'cleared', or 'muted'.</dd> <dt>filter_state_from</dt> <dd>The number of days from now to use as a lower bound on the date that the message is in the given state. Defaults to no lower bound. Ignored if filter_state is not provided.</dd> <dt>filter_state_to</dt> <dd>The number of days from now to use as an upper bound on the date that the message is in the given state. Defaults to no upper bound. Ignored if filter_state is not provided.</dd> </dl> <h4>Audit Log</h4> <p>Export a file containing the audit log.</p> <pre>/api/v1/export/audit</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> </dl> <h4>User Feedback</h4> <p>Export a file containing the user feedback.</p> <pre>/api/v1/export/feedback</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> </dl>",
          "translations": [
              {
                  "locale": "en",
                  "content": "<p>You can export data by making requests to specific URLs.</p> <h4>Forms</h4> <p>Export a file containing all submitted forms.</p> <pre>/api/v1/export/forms/{formcode}</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> <dt>columns</dt> <dd> <p>An orderered array of columns to export, eg:</p> <pre>[\"reported_date\",\"from\",\"related_entities.clinic.name\"]</pre> <p>Defaults to:</p> <pre>[\"_id\",\"patient_id\",\"reported_date\", \"from\", \"related_entities.clinic.contact.name\", \"related_entities.clinic.name\", \"related_entities.clinic.parent.contact.name\", \"related_entities.clinic.parent.name\", \"related_entities.clinic.parent.parent.name\"]</pre> <p>Available columns:</p> <ul> <li>_id</li> <li>patient_id</li> <li>reported_date</li> <li>from</li> <li>related_entities.clinic.name</li> <li>related_entities.clinic.external_id</li> <li>related_entities.clinic.contact.name</li> <li>related_entities.clinic.parent.name</li> <li>related_entities.clinic.parent.external_id</li> <li>related_entities.clinic.parent.contact.name</li> <li>related_entities.clinic.parent.parent.name</li> <li>related_entities.clinic.parent.parent.external_id</li> </ul> <p>All form fields will be included as columns at the end regardless of the value for this parameter.</p> </dd> </dl> <h4>Messages</h4> <p>Export a file containing all messages</p> <pre>/api/v1/export/messages</pre> <p>Examples:</p> <p>Return only rows that are scheduled to be sent in the next ten days.</p> <pre>/export/messages?filter_state=scheduled&amp;filter_state_to=10</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> <dt>columns</dt> <dd> <p>An orderered array of columns to export, eg:</p> <pre>[\"reported_date\",\"from\",\"related_entities.clinic.name\"]</pre> <p>Defaults to:</p> <pre>[\"_id\",\"patient_id\",\"reported_date\", \"from\", \"related_entities.clinic.contact.name\", \"related_entities.clinic.name\", \"related_entities.clinic.parent.contact.name\", \"related_entities.clinic.parent.name\", \"related_entities.clinic.parent.parent.name\",\"task.type\",\"task.state\",\"received\",\"scheduled\",\"pending\",\"sent\",\"cleared\",\"muted\"]</pre> <p>Available columns:</p> <ul> <li>_id</li> <li>patient_id</li> <li>reported_date</li> <li>from</li> <li>related_entities.clinic.name</li> <li>related_entities.clinic.external_id</li> <li>related_entities.clinic.contact.name</li> <li>related_entities.clinic.parent.name</li> <li>related_entities.clinic.parent.external_id</li> <li>related_entities.clinic.parent.contact.name</li> <li>related_entities.clinic.parent.parent.name</li> <li>related_entities.clinic.parent.parent.external_id</li> <li>task.type</li> <li>task.state</li> <li>received</li> <li>scheduled</li> <li>pending</li> <li>sent</li> <li>cleared</li> <li>muted</li> </ul> <p>Regardless of the value for this parameter, for each message the following four columns will be appended</p> <ul> <li>Message UUID</li> <li>Sent By</li> <li>To phone</li> <li>Message Body</li> </ul> </dd> <dt>filter_state</dt> <dd>Used in conjunction with the parameters below to only return messages that were in a given state. Possible values are 'received', 'scheduled', 'pending', 'sent', 'cleared', or 'muted'.</dd> <dt>filter_state_from</dt> <dd>The number of days from now to use as a lower bound on the date that the message is in the given state. Defaults to no lower bound. Ignored if filter_state is not provided.</dd> <dt>filter_state_to</dt> <dd>The number of days from now to use as an upper bound on the date that the message is in the given state. Defaults to no upper bound. Ignored if filter_state is not provided.</dd> </dl> <h4>Audit Log</h4> <p>Export a file containing the audit log.</p> <pre>/api/v1/export/audit</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> </dl> <h4>User Feedback</h4> <p>Export a file containing the user feedback.</p> <pre>/api/v1/export/feedback</pre> <p>Parameters:</p> <dl class=\"horizontal\"> <dt>format</dt> <dd>The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.</dd> <dt>locale</dt> <dd>Locale for translatable data. Defaults to 'en'.</dd> <dt>tz</dt> <dd>The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.</dd> <dt>skip_header_row</dt> <dd>'true' to omit the column headings. Defaults to 'false'.</dd> </dl>"
              }
          ]
      },
      {
          "key": "Phone number example",
          "default": "Configured default country code will be prepended if necessary, eg: 0275551234, or +64275551234",
          "translations": [
              {
                  "locale": "en",
                  "content": "Configured default country code will be prepended if necessary, eg: 0275551234, or +64275551234"
              }
          ]
      },
      {
          "key": "Reading file",
          "default": "Reading file...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Reading file..."
              }
          ]
      },
      {
          "key": "Processed number of total records",
          "default": "Processed {{number}}/{{total}} records...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Processed {{number}}/{{total}} records..."
              }
          ]
      },
      {
          "key": "Restored number of total records",
          "default": "{{number}}/{{total}} facilities restored.",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{number}}/{{total}} facilities restored."
              }
          ]
      },
      {
          "key": "Skipped number of records",
          "default": "Skipped {{number}} records.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Skipped {{number}} records."
              }
          ]
      },
      {
          "key": "number errors",
          "default": "We encountered {{number}} errors:",
          "translations": [
              {
                  "locale": "en",
                  "content": "We encountered {{number}} errors:"
              }
          ]
      },
      {
          "key": "Failed validation",
          "default": "Failed validation",
          "translations": [
              {
                  "locale": "en",
                  "content": "Failed validation"
              }
          ]
      },
      {
          "key": "Save failed",
          "default": "Save failed",
          "translations": [
              {
                  "locale": "en",
                  "content": "Save failed"
              }
          ]
      },
      {
          "key": "Saved",
          "default": "Saved",
          "translations": [
              {
                  "locale": "en",
                  "content": "Saved"
              }
          ]
      },
      {
          "key": "The first time must be earlier than the second time",
          "default": "The first time must be earlier than the second time",
          "translations": [
              {
                  "locale": "en",
                  "content": "The first time must be earlier than the second time"
              }
          ]
      },
      {
          "key": "File not found",
          "default": "File not found",
          "translations": [
              {
                  "locale": "en",
                  "content": "File not found"
              }
          ]
      },
      {
          "key": "The unit must be an integer",
          "default": "The unit must be an integer",
          "translations": [
              {
                  "locale": "en",
                  "content": "The unit must be an integer"
              }
          ]
      },
      {
          "key": "The group must be an integer",
          "default": "The group must be an integer",
          "translations": [
              {
                  "locale": "en",
                  "content": "The group must be an integer"
              }
          ]
      },
      {
          "key": "The offset unit must be an integer",
          "default": "The offset unit must be an integer",
          "translations": [
              {
                  "locale": "en",
                  "content": "The offset unit must be an integer"
              }
          ]
      },
      {
          "key": "Patient Report",
          "default": "Patient Report",
          "translations": [
              {
                  "locale": "en",
                  "content": "Patient Report"
              }
          ]
      },
      {
          "key": "Default Application Language",
          "default": "Default Application Language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Default Application Language"
              }
          ]
      },
      {
          "key": "Language For Outgoing Messages",
          "default": "Language For Outgoing Messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Language For Outgoing Messages"
              }
          ]
      },
      {
          "key": "Languages",
          "default": "Languages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Languages"
              }
          ]
      },
      {
          "key": "Application Text",
          "default": "Application Text",
          "translations": [
              {
                  "locale": "en",
                  "content": "Application Text"
              }
          ]
      },
      {
          "key": "Edit language",
          "default": "Edit language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Edit language"
              }
          ]
      },
      {
          "key": "Add new language",
          "default": "Add new language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Add new language"
              }
          ]
      },
      {
          "key": "Name",
          "default": "Name",
          "translations": [
              {
                  "locale": "en",
                  "content": "Name"
              }
          ]
      },
      {
          "key": "Language code",
          "default": "Language code",
          "translations": [
              {
                  "locale": "en",
                  "content": "Language code"
              }
          ]
      },
      {
          "key": "Error retrieving settings",
          "default": "Error retrieving settings",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error retrieving settings"
              }
          ]
      },
      {
          "key": "Submitting",
          "default": "Submitting...",
          "translations": [
              {
                  "locale": "en",
                  "content": "Submitting..."
              }
          ]
      },
      {
          "key": "Language name help",
          "default": "The display name for the language.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The display name for the language."
              }
          ]
      },
      {
          "key": "Language code help",
          "default": "The 2 or 3 digit code for the language.",
          "translations": [
              {
                  "locale": "en",
                  "content": "The 2 or 3 digit code for the language."
              }
          ]
      },
      {
          "key": "Edit translation",
          "default": "Edit translation",
          "translations": [
              {
                  "locale": "en",
                  "content": "Edit translation"
              }
          ]
      },
      {
          "key": "Default",
          "default": "Default",
          "translations": [
              {
                  "locale": "en",
                  "content": "Default"
              }
          ]
      },
      {
          "key": "Set as default application language",
          "default": "Set as default application language",
          "translations": [
              {
                  "locale": "en",
                  "content": "Set as default application language"
              }
          ]
      },
      {
          "key": "Set as language for outgoing messages",
          "default": "Set as language for outgoing messages",
          "translations": [
              {
                  "locale": "en",
                  "content": "Set as language for outgoing messages"
              }
          ]
      },
      {
          "key": "Disable",
          "default": "Disable",
          "translations": [
              {
                  "locale": "en",
                  "content": "Disable"
              }
          ]
      },
      {
          "key": "Enable",
          "default": "Enable",
          "translations": [
              {
                  "locale": "en",
                  "content": "Enable"
              }
          ]
      },
      {
          "key": "Outgoing Message",
          "default": "Outgoing Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Outgoing Message"
              }
          ]
      },
      {
          "key": "Notifications",
          "default": "Notifications",
          "translations": [
              {
                  "locale": "en",
                  "content": "Notifications"
              }
          ]
      },
      {
          "key": "Import translations",
          "default": "Import translations",
          "translations": [
              {
                  "locale": "en",
                  "content": "Import translations"
              }
          ]
      },
      {
          "key": "Translation file",
          "default": "Translation file",
          "translations": [
              {
                  "locale": "en",
                  "content": "Translation file"
              }
          ]
      },
      {
          "key": "Translation file help",
          "default": "Select the .properties file to import to replace the translations for this language. The easiest way to generate a file with the correct format is to export the translations for this language, make any modifications, then import.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Select the .properties file to import to replace the translations for this language. The easiest way to generate a file with the correct format is to export the translations for this language, make any modifications, then import."
              }
          ]
      },
      {
          "key": "Error parsing properties file",
          "default": "Error parsing properties file",
          "translations": [
              {
                  "locale": "en",
                  "content": "Error parsing properties file"
              }
          ]
      },
      {
          "key": "No submission",
          "default": "No submission",
          "translations": [
              {
                  "locale": "en",
                  "content": "No submission"
              }
          ]
      },
      {
          "key": "Submit via web",
          "default": "Submit via web",
          "translations": [
              {
                  "locale": "en",
                  "content": "Submit via web"
              }
          ]
      },
      {
          "key": "Missing translations",
          "default": "{{missing}} translations missing",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{missing}} translations missing"
              }
          ]
      },
      {
          "key": "No records found",
          "default": "No records found",
          "translations": [
              {
                  "locale": "en",
                  "content": "No records found"
              }
          ]
      },
      {
          "key": "field digits only",
          "default": "{{field}} must only contain numerical digits.",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{field}} must only contain numerical digits."
              }
          ]
      },
      {
          "key": "Phone number not valid",
          "default": "Not a valid phone number.",
          "translations": [
              {
                  "locale": "en",
                  "content": "Not a valid phone number."
              }
          ]
      },
      {
          "key": "Invalid contact numbers",
          "default": "These recipients do not have a valid contact number: {{recipients}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "These recipients do not have a valid contact number: {{recipients}}"
              }
          ]
      },
      {
          "key": "Everyone at",
          "default": "Everyone at {{facility}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "Everyone at {{facility}}"
              }
          ]
      },
      {
          "key": "count of max characters",
          "default": "{{count}}/{{max}} characters",
          "translations": [
              {
                  "locale": "en",
                  "content": "{{count}}/{{max}} characters"
              }
          ]
      },
      {
          "key": "to recipient",
          "default": "to {{recipient}}",
          "translations": [
              {
                  "locale": "en",
                  "content": "to {{recipient}}"
              }
          ]
      },
      {
          "key": "Message UUID",
          "default": "Message UUID",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message UUID"
              }
          ]
      },
      {
          "key": "Sent By",
          "default": "Sent By",
          "translations": [
              {
                  "locale": "en",
                  "content": "Sent By"
              }
          ]
      },
      {
          "key": "To Phone",
          "default": "To Phone",
          "translations": [
              {
                  "locale": "en",
                  "content": "To Phone"
              }
          ]
      },
      {
          "key": "Message Body",
          "default": "Message Body",
          "translations": [
              {
                  "locale": "en",
                  "content": "Message Body"
              }
          ]
      },
      {
          "key": "form",
          "default": "Form",
          "translations": [
              {
                  "locale": "en",
                  "content": "Form"
              }
          ]
      },
      {
          "key": "Task Message",
          "default": "Task Message",
          "translations": [
              {
                  "locale": "en",
                  "content": "Task Message"
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
