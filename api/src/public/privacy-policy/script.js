document.addEventListener('DOMContentLoaded', function() {
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', function() {
      history.go(-1);
    }, false);
  }
});
