document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener('click', () => window.history.back());
  });
});
