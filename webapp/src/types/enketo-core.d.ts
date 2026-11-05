declare module 'enketo-core/src/js/event' {
  const events: {
    BeforeSave: () => CustomEvent;
  };
  export default events;
}
