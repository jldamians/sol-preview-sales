'use strict'

const moment = require('moment')

const DATE_FORMATS = require('../constants/DateFormats')

/**
 * Cambiar formato de fecha
 * @param  {String} Fecha
 * @param  {String} Formato inicial
 * @param  {String} Formato final
 * @return {String} Fecha con nuevo formato
 */
exports.changeDateFormat = function(date, init = DATE_FORMATS.sunat, end = DATE_FORMATS.iso) {
  const newDate = moment(date, init)

  return newDate.isValid() ? newDate.format(end) : undefined
}

/**
 * Función que formatea los importes
 * @param {String} value Importe
 */
exports.amount = function(value) {
  return value != "" && Math.abs(Number.parseFloat(value)) > 0 ? Number.parseFloat(value) : undefined
}

/**
 * Función que gestiona el tipo de cambio de la moneda
 * @param {String} value Moneda
 */
exports.exchangeRate = function(code, value) {
  return code !== 'PEN' ? this.amount(value) : 1
}


