module.exports = [
  {
    title: [{ locale: "en", content: "Postnatal visit needed" }],
    appliesTo: "reports",
    appliesToForms: ["assessment"],
    appliesIf: function() {
      console.log("appliesIf");
      return true;
    },
    actions: [{ form: "test_form" }],
    events: [
      {
        id: "treatment-followup-1",
        days: 0,
        start: 0,
        end: 4,
        title: "sample-treatment-followup"
      }
    ],
    resolvedIf: function() {
      console.log("resolvedIF");
      return true;
    },
    priority: {
      level: "high",
      label: "this is a test"
    }
  }
];
