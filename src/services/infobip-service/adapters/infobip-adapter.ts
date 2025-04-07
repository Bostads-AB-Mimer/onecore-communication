import { Infobip, AuthType } from '@infobip-api/sdk'
import config from '../../../common/config'
import {
  Email,
  ParkingSpaceOfferEmail,
  ParkingSpaceNotificationEmail,
  ParkingSpaceOfferSms,
  WorkOrderEmail,
  WorkOrderSms,
} from 'onecore-types'
import { logger } from 'onecore-utilities'
import striptags from 'striptags'
import he from 'he'

const infobip = new Infobip({
  baseUrl: config.infobip.baseUrl,
  apiKey: config.infobip.apiKey,
  authType: AuthType.ApiKey,
})

const AdditionalParkingSpaceOfferTemplateId = 200000000092027
const NewParkingSpaceOfferSmsTemplateId = 200000000094113
const ReplaceParkingSpaceOfferTemplateId = 200000000094058
const ParkingSpaceAssignedToOtherTemplateId = 200000000092051
const WorkOrderEmailTemplateId = 200000000146435
const WorkOrderExternalContractorEmailTemplateId = 200000000173744

export const sendEmail = async (message: Email) => {
  logger.info({ to: message.to, subject: message.subject }, 'Sending email')

  try {
    const response = await infobip.channels.email.send({
      to: message.to,
      from: 'Bostads Mimer AB <noreply@mimer.nu>',
      subject: message.subject,
      text: message.text,
    })
    if (response.status === 200) {
      logger.info(
        { to: message.to, subject: message.subject },
        'Sending email complete'
      )
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export const sendParkingSpaceOffer = async (email: ParkingSpaceOfferEmail) => {
  logger.info('Sending template email', config.infobip.baseUrl)
  try {
    const toField = JSON.stringify({
      to: email.to,
      placeholders: {
        address: email.address,
        firstName: email.firstName,
        availableFrom: dateFormatter.format(new Date(email.availableFrom)),
        deadlineDate: dateFormatter.format(new Date(email.deadlineDate)),
        rent: formatToSwedishCurrency(email.rent),
        type: email.type,
        parkingSpaceId: email.parkingSpaceId,
        objectId: email.objectId,
        offerURL: email.offerURL,
      },
    })
    const response = await infobip.channels.email.send({
      from: 'Bostads Mimer AB <noreply@mimer.nu>',
      to: toField,
      templateId:
        email.applicationType === 'Replace'
          ? ReplaceParkingSpaceOfferTemplateId
          : AdditionalParkingSpaceOfferTemplateId,
      subject: email.subject, // Might be overriden by tempalte
      text: email.text, // Should be overriden by template, but can be used as fallback
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

const formatToSwedishCurrency = (numberStr: string) => {
  const number = parseFloat(numberStr)

  const formattedNumber = new Intl.NumberFormat('sv-SE', {
    //render max 2 decimals if there are decimals, otherwise render 0 decimals
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: number % 1 === 0 ? 0 : 2,
  }).format(number)

  return formattedNumber + ' kr'
}

const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'UTC' })

export const sendParkingSpaceOfferSms = async (sms: ParkingSpaceOfferSms) => {
  try {
    const response = await infobip.channels.sms.send({
      messages: [
        {
          destinations: [{ to: sms.phoneNumber }],
          from: 'Mimer AB',
          text: `Hej ${sms.firstName}! Vad kul att du anmält intresse på den här bilplatsen! Vi vill nu veta om du vill ha kontraktet. Senast ${sms.deadlineDate} behöver du tacka ja eller nej via Mina sidor.`,
          templateId: NewParkingSpaceOfferSmsTemplateId,
        },
      ],
    })
    logger.info('SMS sent successfully:')
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error('Error sending SMS:', error)
    throw error
  }
}

export const sendParkingSpaceAssignedToOther = async (
  emails: ParkingSpaceNotificationEmail[]
) => {
  try {
    const toField = emails.map((email) => ({
      to: email.to,
      placeholders: {
        address: email.address,
        parkingSpaceId: email.parkingSpaceId,
      },
    }))
    const response = await infobip.channels.email.send({
      from: 'Bostads Mimer AB <noreply@mimer.nu>',
      to: toField,
      templateId: ParkingSpaceAssignedToOtherTemplateId,
      subject: 'Ej erbjuden parkeringsplats',
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export const sendWorkOrderEmail = async (email: WorkOrderEmail) => {
  logger.info('Sending work order email', config.infobip.baseUrl)
  try {
    const toField = JSON.stringify({
      to: email.to,
      placeholders: {
        message: email.text,
        externalContractor: email.externalContractorName,
      },
    })
    const emailPayload: any = {
      from: 'Bostads Mimer AB <noreply@mimer.nu>',
      to: toField,
      subject: email.subject,
      text: email.text,
      templateId: email.externalContractorName
        ? WorkOrderExternalContractorEmailTemplateId
        : WorkOrderEmailTemplateId,
    }

    const response = await infobip.channels.email.send(emailPayload)

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export const sendWorkOrderSms = async (sms: WorkOrderSms) => {
  logger.info('Sending work order sms', config.infobip.baseUrl)
  const message = he.decode(striptags(sms.text.replace(/<br\s*\/?>/gi, '\n')))
  const noreply = sms.externalContractorName
    ? `Hälsningar, ${sms.externalContractorName} i uppdrag från Mimer`
    : 'Detta sms går ej att svara på. Det går bra att återkoppla i ärendet på "Mina sidor".'

  try {
    const response = await infobip.channels.sms.send({
      messages: [
        {
          destinations: [{ to: sms.phoneNumber }],
          from: 'Mimer',
          text: `${message}\n\n${noreply}`,
        },
      ],
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error(response.body)
    }
  } catch (error) {
    logger.error('Error sending SMS:', error)
    throw error
  }
}

export const healthCheck = async () => {
  const response = await infobip.channels.email.send({})

  if (
    response instanceof Error &&
    (response as Error).message != 'email.from is required.'
  )
    throw new Error((response as Error).message)
}
