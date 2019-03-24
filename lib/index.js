'use strict'

const moment = require('moment')

const ISO_DATE_FORMAT = 'YYYY-MM-DD'
const SUNAT_DATE_FORMAT = 'DD/MM/YYYY'

/**
 * Administrar ventas del contribuyente
 * @param {String} period Período contable en formato YYYYMM
 * @param {puppeteer} page Página
 * @constructor
 */
function PreliminarySales(period, page) {
  let _args = {
    period: moment(period, 'YYYYMM'),
    page,
    workspace: null,
    information: null
  }

  Object.defineProperty(this, 'period', {
    get: () => { return _args.period.format('MM/YYYY') }
  })

  Object.defineProperty(this, 'page', {
    get: () => { return _args.page }
  })

  Object.defineProperty(this, 'workspace', {
    get: () => { return _args.workspace },
    set: (value) => { _args.workspace = value }
  })

  Object.defineProperty(this, 'data', {
    get: () => { return _args.data },
    set: (value) => { _args.data = value }
  })

  Object.defineProperty(this, 'information', {
    get: () => { return _args.information },
    set: (value) => { _args.information = value }
  })
}

PreliminarySales.prototype.goto = async function() {
  try {
    await _gotoPreviewLink.bind(this)()

    this.workspace = await _getWorkspace.bind(this)()

    await _acceptConditions.bind(this)()

    await _generateSalesPreview.bind(this)()
  } catch (e) {
    throw e
  }
}

PreliminarySales.prototype.getInformation = async function() {
  this.data = await _getSalesInformation.bind(this)()

  this.information = _getFormattedOutputData.bind(this)()

  return this.information
}

/**
 * Método que linkea a la opción "Preliminar del Registro de Ventas Electrónico"
 */
async function _gotoPreviewLink() {
  try {
    // Esperamos que el menú "Preliminar del Registro de Ventas Electrónico"
    // esté presente en el DOM, sin importar que esté visible
    await this.page.waitForSelector('#nivel4_25_2_1_1_4', {
      timeout: 5000,
      visible: false
    })

    // Cuando un elemento presente en el DOM no es visible,
    // esta es la única forma de acceder a sus eventos (click)
    await this.page.evaluate(()=> {
      const PreviewElectronicSalesBook = document.querySelector('#nivel4_25_2_1_1_4')

      PreviewElectronicSalesBook.click()
    })
  } catch (e) {
    throw new Error(
      'El menú para acceder al registro preliminar de ventas no está disponible'
    )
  }
}

/**
 * Función que obtiene el espacio de trabajo desde donde extraremos los registros de ventas
 * @return {Object} Espacio de trabajo
 */
async function _getWorkspace() {
  try {
    // Esperamos que el iframe donde se muestra el "Preliminar del Registro de Ventas e Ingresos"
    // esté presente en el DOM, para poder acceder a los comprobantes registrados
    await this.page.waitFor('iframe#iframeApplication', {
      timeout: 15000,
      visible: true
    })

    // NOTE: Esto es necesario para que "puppeteer"
    // pueda optener correctamente el iframe
    await this.page.waitFor(1000)

    const frame = await this.page.$('iframe#iframeApplication')

    return await frame.contentFrame()
  } catch (e) {
    throw e
  }
}

/**
 * Método que acepta las condiciones para ser "Generador Electrónico"
 */
async function _acceptConditions() {
  try {
    // TODO: No lanzar excepción, puesto que esto es opcional, es decir puede no existir
    // Declaramos conocer los terminos y condiciones
    const ConditionsCheck = await this.workspace.waitForSelector('input[name="condiciones.cbTerminos"]', {
      timeout: 10000,
      visible: true // default
    })

    await ConditionsCheck.click()

    // TODO: No lanzar excepción, puesto que esto es opcional, es decir puede no existir
    // Aceptamos los terminos y condiciones
    const ContinueButton = await this.workspace.waitForSelector('span[id="condiciones.btnContinuar"]', {
      timeout: 10000,
      visible: true // default
    })

    await ContinueButton.click()
  } catch (e) {
    // NO generar excepción
    //throw e
  }
}

/**
 * Método que genera la vista preliminar del registro de ventas e ingresos
 */
async function _generateSalesPreview() {
  try {
    const PeriodInput = await this.workspace.waitForSelector('input[name="periodoRegistroVentasConMovim"]', {
      timeout: 10000,
      visible: true // default
    })

    await PeriodInput.type(this.period)

    const ElectronicSalesButton = await this.workspace.waitForSelector('span[id="inicio.btnIrRegVentas"]', {
      timeout: 10000,
      visible: true // default
    })

    await ElectronicSalesButton.click()
  } catch (e) {
    throw new Error(
      'Los controles para acceder al registro de ventas no están disponibles'
    )
  }

  try {
    const PreviewElectronicSalesButton = await this.workspace.waitForSelector('span[id="inicioRVI.btnGeneraPreliminarRegVentas"]', {
      timeout: 10000,
      visible: true // default
    })

    await PreviewElectronicSalesButton.click()
  } catch (e) {
    throw new Error(
      'El control para generar el preliminar del registro de ventas no está disponible'
    )
  }
}

/**
 * Función que obtiene los cpe listados en el registro de ventas
 * @return {Array} Lista de CPE's de ventas
 */
async function _getSalesInformation() {
  try {
    await this.workspace.waitForSelector('#rvi_tabla > table', {
      timeout: 15000,
      visible: true // default
    })

    return await this.workspace.evaluate(() => {
      const rowNodeList = Array.from(
        document.querySelectorAll('#rvi_tabla > table tr')
      )

      return rowNodeList.map((tr) => {
        const dataNodeList = Array.from(
          tr.querySelectorAll('td')
        )

        const [
          accountingPeriod,
          operationUniqueCode,
          accountingCorrelativeNumber,
          documentEmissionDate,
          documentExpirationDate,
          documentType,
          documentSerial,
          documentNumber,
          finalNumber,
          customerIdentityId,
          customerIdentityNumber,
          customerName,
          exportAmount, // Exportación
          igvTaxable,
          taxableBaseDiscount,
          totalAmountExempt, // Exonerado
          totalAmountNonTaxable, // Inafecto
          totalAmountIsc,
          igvTax,
          igvTaxDiscount,
          ivapTaxable,
          ivapTax,
          others01,
          payableAmount,
          currencyCode,
          currencyExchangeRate,
          referenceDocumentEmissionDate,
          referenceDocumentType,
          referenceDocumentSerial,
          referenceDocumentNumber
        ] = dataNodeList.map(td => td.textContent)

        return {
          accountingPeriod,
          operationUniqueCode,
          accountingCorrelativeNumber,
          documentEmissionDate,
          documentExpirationDate,
          documentType,
          documentSerial,
          documentNumber,
          finalNumber,
          customerIdentityId,
          customerIdentityNumber,
          customerName,
          exportAmount, // exportación
          igvTaxable,
          taxableBaseDiscount,
          totalAmountExempt, // Exonerado
          totalAmountNonTaxable, // Inafecto
          totalAmountIsc,
          igvTax,
          igvTaxDiscount,
          ivapTaxable,
          ivapTax,
          others01,
          payableAmount, // Total
          currencyCode,
          currencyExchangeRate,
          referenceDocumentEmissionDate,
          referenceDocumentType,
          referenceDocumentSerial,
          referenceDocumentNumber
        }
      })
    })
  } catch (e) {
    throw new Error(
      'La tabla con el preliminar del registro de ventas no está disponible'
    )
  }
}

/**
 * Función que devuelve los datos formatados y estructurados
 * @return {Array} Lista de CPE's de ventas
 */
function _getFormattedOutputData() {
  return this.data.filter((cpe) => {
    const documentEmissionDate = moment(cpe.documentEmissionDate, SUNAT_DATE_FORMAT)

    const itsCorrectEmissionDate = documentEmissionDate.isValid()

    if (itsCorrectEmissionDate) {
      return true
    } else {
      return false
    }
  }).map((cpe) => {
    let information = {}

    const customerInformation = cpe.customerIdentityId.trim().split('-')

    const cpeInformation = cpe.documentType.trim().split('-')

    const refInformation = cpe.referenceDocumentType.trim().split('-')

    const customerIdentityType = customerInformation[0].trim()

    const cpeType = cpeInformation[0].trim()

    const cpeIssuanceDate = moment(cpe.documentEmissionDate.trim(), SUNAT_DATE_FORMAT)

    const cpeExpirationDate = moment(cpe.documentExpirationDate.trim(), SUNAT_DATE_FORMAT)

    let refType = null

    let refIssuanceDate = null

    // cuando el cpe es una nota de crédito/débito, existe referencia
    const existsDocumentReference = (
      ['07', '08'].includes(cpeType)
    )

    information.cuo = cpe.operationUniqueCode

    information.sequential = cpe.accountingCorrelativeNumber

    information.accountingPeriod = moment(this.period, 'MM/YYYY').format('YYYYMM00'),

    information.cpe = {
      type: cpeType,
      serial: cpe.documentSerial.trim(),
      number: cpe.documentNumber.trim(),
      issuanceDate: (
        cpeIssuanceDate.isValid() ? cpeIssuanceDate.format(ISO_DATE_FORMAT) : undefined
      ),
      expirationDate: (
        cpeExpirationDate.isValid() ? cpeExpirationDate.format(ISO_DATE_FORMAT) : undefined
      )
    }

    information.currency = {
      code: cpe.currencyCode,
      exchangeRate: _exchangeRate(cpe.currencyCode, cpe.currencyExchangeRate)
    }

    // TODO: agregar validación para el caso donde la boleta no tenga receptor
    // TODO: agregar soporte para isc

    information.customer = {
      identityType: customerIdentityType,
      identityNumber: cpe.customerIdentityNumber.trim(),
      name: cpe.customerName.trim()
    }

    if (existsDocumentReference) {
      refType = refInformation[0].trim()

      refIssuanceDate = moment(cpe.referenceDocumentEmissionDate.trim(), SUNAT_DATE_FORMAT)

      information.reference = {
        type: refType,
        serial: cpe.referenceDocumentSerial.trim(),
        number: cpe.referenceDocumentNumber.trim(),
        issuanceDate: (
          refIssuanceDate.isValid() ? refIssuanceDate.format(ISO_DATE_FORMAT) : undefined
        )
      }
    }

    if (_amount(cpe.igvTax) != null && _amount(cpe.igvTaxable) != null) {
      information.igv = {
        taxAmount: _amount(cpe.igvTax),        
        taxableAmount: _amount(cpe.igvTaxable)
      }
    }

    if (_amount(cpe.ivapTax) != null && _amount(cpe.ivapTaxable) != null) {
      information.ivap = {
        taxAmount: _amount(cpe.ivapTax),
        taxableAmount: _amount(cpe.ivapTaxable)
      }
    }

    if (_amount(cpe.igvTaxable) != null) {
      information.taxableAmount = _amount(cpe.igvTaxable)
    }

    if (_amount(cpe.exportAmount) != null) {
      information.exportAmount = _amount(cpe.exportAmount)
    }

    if (_amount(cpe.totalAmountExempt) != null) {
      information.exemptAmount = _amount(cpe.totalAmountExempt)
    }

    if (_amount(cpe.nonTaxableAmount) != null) {
      information.nonTaxableAmount = _amount(cpe.nonTaxableAmount)
    }

    if (_amount(cpe.payableAmount) != null) {
      information.payableAmount = _amount(cpe.payableAmount)
    }

    return information
  })
}

/**
 * Función que formatea los importes
 * @param {String} value Importe
 */
function _amount(value) {
  return value != "" && Number.parseFloat(value) > 0 ? Number.parseFloat(value) : undefined
}

/**
 * Función que gestiona el tipo de cambio de la moneda
 * @param {String} value Moneda
 */
function _exchangeRate(code, value) {
  return code !== 'PEN' ? _amount(value) : 1
}

module.exports = PreliminarySales
