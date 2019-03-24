'use strict'

const moment = require('moment')

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
          sequential,
          cpeIssuanceDate,
          cpeExpirationDate,
          cpeTypeInfo,
          cpeSerial,
          cpeNumber,
          finalNumber,
          customerIdentityTypeInfo,
          customerIdentityNumber,
          customerName,
          exportAmount, // Exportación
          igvTaxable,
          igvTaxableDiscount,
          exemptAmount, // Exonerado
          nonTaxableAmount, // Inafecto
          iscTax,
          igvTax,
          igvTaxDiscount,
          ivapTaxable,
          ivapTax,
          otherChargesAmount,
          payableAmount,
          currencyCode,
          currencyExchangeRate,
          refIssuanceDate,
          refTypeInfo,
          refSerial,
          refNumber
        ] = dataNodeList.map(td => td.textContent)

        return {
          accountingPeriod,
          operationUniqueCode,
          sequential,
          cpeIssuanceDate,
          cpeExpirationDate,
          cpeTypeInfo,
          cpeSerial,
          cpeNumber,
          finalNumber, // sin exponer
          customerIdentityTypeInfo,
          customerIdentityNumber,
          customerName,
          exportAmount,
          igvTaxable,
          igvTaxableDiscount,
          exemptAmount,
          nonTaxableAmount,
          iscTax,
          igvTax,
          igvTaxDiscount,
          ivapTaxable,
          ivapTax,
          otherChargesAmount,
          payableAmount, // Total
          currencyCode,
          currencyExchangeRate,
          refIssuanceDate,
          refTypeInfo,
          refSerial,
          refNumber
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
    const cpeIssuanceDate = moment(cpe.cpeIssuanceDate, SUNAT_DATE_FORMAT)

    const isValidIssuanceDate = cpeIssuanceDate.isValid()

    if (isValidIssuanceDate) {
      return true
    } else {
      return false
    }
  }).map((cpe) => {
    let information = {}

    const customerInformation = cpe.customerIdentityTypeInfo.trim().split('-')

    const cpeInformation = cpe.cpeTypeInfo.trim().split('-')

    const refInformation = cpe.refTypeInfo.trim().split('-')

    const customerIdentityType = customerInformation[0].trim()

    const cpeType = cpeInformation[0].trim()

    const cpeIssuanceDate = _changeDateFormat(cpe.cpeIssuanceDate.trim())

    const cpeExpirationDate = _changeDateFormat(cpe.cpeExpirationDate.trim())

    let refType = null

    let refIssuanceDate = null

    // cuando el cpe es una nota de crédito/débito, existe referencia
    const existsDocumentReference = (
      ['07', '08'].includes(cpeType)
    )

    information.cuo = cpe.operationUniqueCode

    information.sequential = cpe.sequential

    information.accountingPeriod = _changeDateFormat(this.period, 'MM/YYYY', 'YYYYMM00')

    information.cpe = {
      type: cpeType,
      serial: cpe.cpeSerial.trim(),
      number: cpe.cpeNumber.trim(),
      issuanceDate: cpeIssuanceDate,
      expirationDate: cpeExpirationDate
    }

    information.currency = {
      code: cpe.currencyCode,
      exchangeRate: _exchangeRate(cpe.currencyCode, cpe.currencyExchangeRate)
    }

    // TODO: agregar validación para el caso donde la boleta no tenga receptor
    // TODO: agregar soporte para isc
    // TODO: agregar validación para exponer monto gravado en caso sea nota de crédito

    information.customer = {
      identityType: customerIdentityType,
      identityNumber: cpe.customerIdentityNumber.trim(),
      name: cpe.customerName.trim()
    }

    if (existsDocumentReference) {
      refType = refInformation[0].trim()

      refIssuanceDate = _changeDateFormat(cpe.refIssuanceDate.trim())

      information.reference = {
        type: refType,
        serial: cpe.refSerial.trim(),
        number: cpe.refNumber.trim(),
        issuanceDate: refIssuanceDate
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

    if (_amount(cpe.exemptAmount) != null) {
      information.exemptAmount = _amount(cpe.exemptAmount)
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
 * Cambiar formato de fecha
 * @param  {String} Fecha
 * @param  {String} Formato inicial
 * @param  {String} Formato final
 * @return {String} Fecha con nuevo formato
 */
function _changeDateFormat(date, init = 'DD/MM/YYYY', end = 'YYYY-MM-DD') {
  const newDate = moment(date, init)

  return newDate.isValid() ? newDate.format(end) : undefined
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
