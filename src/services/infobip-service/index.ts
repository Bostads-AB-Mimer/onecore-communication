import KoaRouter from '@koa/router'
import validator from 'validator'
import { validator as phoneValidator, normalize } from 'telefonnummer'
import {
  sendEmail,
  sendParkingSpaceOffer,
  sendParkingSpaceAssignedToOther,
  sendParkingSpaceOfferSms,
  sendWorkOrderSms,
} from './adapters/infobip-adapter'
import {
  Email,
  ParkingSpaceOfferEmail,
  ParkingSpaceNotificationEmail,
  ParkingSpaceOfferSms,
  WorkOrderSms,
} from 'onecore-types'
import { generateRouteMetadata, logger } from 'onecore-utilities'

export const routes = (router: KoaRouter) => {
  router.post('(.*)/sendMessage', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const message = ctx.request.body
    if (!isMessageEmail(message)) {
      ctx.status = 400
      ctx.body = { reason: 'Message is not an email object', ...metadata }
      return
    }
    try {
      const result = await sendEmail(message)
      ctx.status = 200
      ctx.body = { content: result.data, ...metadata }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        error: error.message,
        ...metadata,
      }
    }
  })

  router.post('(.*)/sendParkingSpaceOffer', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const emailData = ctx.request.body

    if (!isParkingSpaceOfferEmail(emailData)) {
      ctx.status = 400
      ctx.body = { reason: 'Message is not an email object', ...metadata }
      return
    }
    try {
      const result = await sendParkingSpaceOffer(emailData)
      ctx.status = 200
      ctx.body = { content: result.data, ...metadata }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        error: error.message,
        ...metadata,
      }
    }
  })
  router.post('(.*)/sendNotification', async (ctx) => {
    const { applicants } = ctx.request.body as {
      applicants: ParkingSpaceNotificationEmail[]
    }
    if (!Array.isArray(applicants)) {
      ctx.throw(400, 'Message is not an email object')
      return
    }
    try {
      const result = await sendParkingSpaceAssignedToOther(applicants)
      ctx.status = 200
      ctx.body = result.data
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        message: error.message,
      }
    }
  })

  router.post('(.*)/sendSms', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)

    try {
      const sms = ctx.request.body
      if (!isValidParkingSpaceOfferSms(sms)) {
        ctx.throw(400, 'Message is not an sms object')
        return
      }

      let phoneNumber = sms.phoneNumber
      if (!phoneValidator(phoneNumber)) {
        ctx.throw(400, 'Invalid phone number')
        return
      }
      phoneNumber = '46' + normalize(phoneNumber).slice(1)

      const result = await sendParkingSpaceOfferSms({ ...sms, phoneNumber })
      ctx.status = 200
      ctx.body = { content: result, ...metadata }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        message: error.message,
        ...metadata,
      }
    }
  })

  router.post('(.*)/sendWorkOrderSms', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)

    try {
      const sms = ctx.request.body
      if (!isValidWorkOrderSms(sms)) {
        ctx.status = 400
        ctx.body = {
          reason: 'Message is not a WorkOrderSms object',
          ...metadata,
        }
        return
      }

      let phoneNumber = sms.phoneNumber
      if (!phoneValidator(phoneNumber, { onlyMobile: true })) {
        ctx.status = 400
        ctx.body = {
          reason: 'Invalid phone number',
          ...metadata,
        }
        return
      }
      phoneNumber = '46' + normalize(phoneNumber).slice(1)

      const result = await sendWorkOrderSms({
        message: sms.message,
        phoneNumber,
      })
      ctx.status = 200
      ctx.body = { content: result, ...metadata }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        message: error.message,
        ...metadata,
      }
    }
  })

  router.post('(.*)/sendWorkOrderEmail', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const emailData = ctx.request.body

    if (!isMessageEmail(emailData)) {
      ctx.status = 400
      ctx.body = { reason: 'Message is not an email object', ...metadata }
      return
    }
    try {
      const result = await sendEmail(emailData)
      ctx.status = 200
      ctx.body = { content: result.data, ...metadata }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        error: error.message,
        ...metadata,
      }
    }
  })
}

export const isParkingSpaceOfferEmail = (
  emailData: any
): emailData is ParkingSpaceOfferEmail => {
  return (
    typeof emailData === 'object' &&
    emailData !== null &&
    typeof emailData.to === 'string' &&
    validator.isEmail(emailData.to) &&
    typeof emailData.subject === 'string' &&
    typeof emailData.text === 'string' &&
    typeof emailData.address === 'string' &&
    typeof emailData.firstName === 'string' &&
    typeof emailData.availableFrom === 'string' &&
    typeof emailData.deadlineDate === 'string' &&
    typeof emailData.rent === 'string' &&
    typeof emailData.type === 'string' &&
    typeof emailData.parkingSpaceId === 'string' &&
    typeof emailData.objectId === 'string' &&
    typeof emailData.applicationType === 'string'&&
    typeof emailData.offerURL === 'string'
  )
}

export const isMessageEmail = (message: any): message is Email => {
  return !!(
    message &&
    typeof message === 'object' &&
    message.to &&
    typeof message.to === 'string' &&
    validator.isEmail(message.to) &&
    message.subject &&
    typeof message.subject === 'string' &&
    message.text &&
    typeof message.text === 'string'
  )
}

export const isValidParkingSpaceOfferSms = (
  sms: any
): sms is ParkingSpaceOfferSms => {
  return (
    typeof sms === 'object' &&
    sms !== null &&
    typeof sms.phoneNumber === 'string' &&
    typeof sms.firstName === 'string' &&
    typeof sms.deadlineDate === 'string'
  )
}

export const isValidWorkOrderSms = (sms: any): sms is WorkOrderSms => {
  return (
    typeof sms === 'object' &&
    sms !== null &&
    typeof sms.phoneNumber === 'string' &&
    typeof sms.message === 'string'
  )
}
