/* globals svgEditor */
import signaizerDialogHTML from './signaizerDialog.html'

const template = document.createElement('template')
template.innerHTML = signaizerDialogHTML

/**
 * @class SeSignaizerDialog
 */
export class SeSignaizerDialog extends HTMLElement {
  /**
   * @function constructor
   */
  constructor () {
    super()
    // create the shadowDom and insert the template
    this._shadowRoot = this.attachShadow({ mode: 'open' })
    this._shadowRoot.append(template.content.cloneNode(true))
    
    this.$dialog = this._shadowRoot.querySelector('#signaizer_dialog')
    this.$generateBtn = this._shadowRoot.querySelector('#signaizer_generate_btn')
    this.$cancelBtn = this._shadowRoot.querySelector('#signaizer_cancel_btn')
    this.$textInput = this._shadowRoot.querySelector('#signaizer_text')
    this.$hintInput = this._shadowRoot.querySelector('#signaizer_hint')
    this.$hintFeedback = this._shadowRoot.querySelector('#signaizer_hint_feedback')

    // The URL where your SignAIzer Next.js app is running
    this.SIGNAIZER_API_URL = 'http://localhost:3000' // IMPORTANT: Change this to your actual SignAIzer app URL
  }

  /**
   * @function init
   * @param {any} i18next
   * @returns {void}
   */
  init (i18next) {
    // Initialize internationalization if needed
    // For now, we'll use hardcoded English text
  }

  /**
   * @function observedAttributes
   * @returns {any} observed
   */
  static get observedAttributes () {
    return ['dialog']
  }

  /**
   * @function attributeChangedCallback
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   * @returns {void}
   */
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'dialog' && newValue === 'open') {
      this.openDialog()
    } else if (name === 'dialog' && newValue === 'close') {
      this.closeDialog()
    }
  }

  /**
   * @function connectedCallback
   * @returns {void}
   */
  connectedCallback () {
    this.setupEventListeners()
  }

  /**
   * Setup event listeners for the dialog
   * @returns {void}
   */
  setupEventListeners () {
    // Cancel button
    this.$cancelBtn.addEventListener('click', () => {
      this.closeDialog()
    })

    // Generate button
    this.$generateBtn.addEventListener('click', async () => {
      await this.handleGenerate()
    })

    // Style hint validation on blur
    this.$hintInput.addEventListener('blur', async () => {
      await this.checkStyleHint()
    })
  }

  /**
   * Open the dialog
   * @returns {void}
   */
  openDialog () {
    this.$dialog.opened = true
    this.$textInput.value = ''
    this.$hintInput.value = ''
    this.$hintFeedback.textContent = ''
    this.$textInput.focus()
  }

  /**
   * Close the dialog
   * @returns {void}
   */
  closeDialog () {
    this.$dialog.opened = false
  }

  /**
   * Handle the Generate button click
   * @returns {Promise<void>}
   */
  async handleGenerate () {
    const text = this.$textInput.value.trim()
    const styleHint = this.$hintInput.value.trim()

    if (!text) {
      alert('Please enter a text prompt.')
      return
    }

    // Provide visual feedback that generation is in progress
    const originalText = this.$generateBtn.textContent
    this.$generateBtn.textContent = 'Generating...'
    this.$generateBtn.disabled = true

    try {
      const response = await fetch(`${this.SIGNAIZER_API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          styleHint: styleHint,
          type: '3d' // or '2d' based on your needs
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to generate SVG from API.')
      }

      const result = await response.json()
      const svgString = atob(result.svgDataUri.split(',')[1]) // Decode base64 SVG data

      // Use svgCanvas's built-in function to import the SVG string
      if (window.svgCanvas) {
        window.svgCanvas.importSvgString(svgString, true) // The 'true' is for 'as string'
        window.svgCanvas.alignSelectedElements('c', 'c')
        window.svgCanvas.ungroupSelectedElement() // Ungroup to make it editable
        window.svgCanvas.selectOnly([window.svgCanvas.getCurrentDrawing().getLastCreatedElem()])
      }

      // Close dialog
      this.closeDialog()
    } catch (error) {
      console.error('SignAIzer API Error:', error)
      alert('An error occurred: ' + error.message)
    } finally {
      this.$generateBtn.textContent = originalText
      this.$generateBtn.disabled = false
    }
  }

  /**
   * Check style hint when user blurs the hint input
   * @returns {Promise<void>}
   */
  async checkStyleHint () {
    const hint = this.$hintInput.value.trim()
    
    if (!hint) {
      this.$hintFeedback.textContent = ''
      return
    }

    this.$hintFeedback.textContent = 'Checking hint...'
    this.$hintFeedback.style.color = '#666'

    try {
      const response = await fetch(`${this.SIGNAIZER_API_URL}/api/check-style-hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ styleHint: hint })
      })

      if (!response.ok) {
        throw new Error('API check failed.')
      }

      const result = await response.json()
      // Display the feedback and style it based on the result
      this.$hintFeedback.textContent = result.feedback
      this.$hintFeedback.style.color = result.isLikelyLegible ? 'green' : 'orange'
    } catch (error) {
      console.error('Style hint check error:', error)
      this.$hintFeedback.textContent = 'Could not check hint.'
      this.$hintFeedback.style.color = 'red'
    }
  }
}

// Register
customElements.define('se-signaizer-dialog', SeSignaizerDialog)