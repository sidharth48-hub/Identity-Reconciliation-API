import { Request, Response, NextFunction } from "express";
import Joi from 'joi';
import { IdentifyRequest } from "../types";

const identifySchema = Joi.object({
    email: Joi.string().email().allow(null, '').optional(),
    phoneNumber: Joi.alternatives()
    .try(
        Joi.string().pattern(/^\d+$/).min(10).max(15),
        Joi.number().integer().positive()
    )
    .allow(null)
    .optional()
}).custom((value, helpers) => {
    //At least one of email or phoneNumber must be provided and not null
    if ((!value.email || value.email === '') && (!value.phoneNumber || value.phoneNumber === '')) {
        return helpers.error('any.custom', {
            message: 'At least one of email or phoneNumber must be provided'
        });
    }
    return value;
});


export const validateIdentifyRequest = (req:Request, res: Response, next: NextFunction) => {
    const {error, value} = identifySchema.validate(req.body);

    if(error){
        return res.status(400).json({
            error: 'Validation error',
            details: error.details[0].message
        });
    }

    //Sanitize the data
    const sanitizedData: IdentifyRequest = {
        email: value.email ? value.email.toLowerCase().trim() : null,
        phoneNumber: value.phoneNumber ? String(value.phoneNumber.trim()) : null
    };

    //Replace empty strings with null
    if(sanitizedData.email === '') sanitizedData.email = null;
    if(sanitizedData.phoneNumber === '') sanitizedData.phoneNumber = null;

    req.body = sanitizedData;
    next()
}