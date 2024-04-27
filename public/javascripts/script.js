const submitBtn = document.querySelector(`[type='submit']`)
const form = document.querySelector('form')

form.addEventListener('submit', () => {
  submitBtn.disabled = true
})
