//
// Writing more globals is gross, but the alternatives are grosser!
//
// We could write to localstorage, but we're only allowed to store a single
// string per key (no arrays), and we'd have to manage clearing logic manually
// (globals only persist for this reboot, which is what we're after).
//
const feedback = msg => {
  if (!window.bootstrapFeedback) {
    window.bootstrapFeedback = [msg];
  } else {
    window.bootstrapFeedback.push(msg);
  }
};

module.exports = {
  // Store a piece of feedback to be later sent as a feedback document when (if)
  // the application boots, via the Feedback service.
  feedback: feedback
};
