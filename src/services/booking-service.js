const axios = require("axios")

const { BookingRepository } = require('../repositories')
const db = require('../models');
const {ServerConfig, Queue} = require('../config');
const AppError = require("../utils/errors/app-error");
const { StatusCodes } = require("http-status-codes");
const {Enums} = require('../utils/common');
const { BOOKED, CANCELLED } = Enums.BOOKING_STATUS;
const ServiceError = require("../utils/errors/service-error");
const bookingRepository = new BookingRepository();

async function createBooking(data){
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        const flightData = flight.data.data;
        if(data.noOfSeat > flightData.totalSeats) {
            throw new ServiceError('Something went wrong in the booking process', 'Not enough seats available', StatusCodes.BAD_REQUEST);
        }
        const totalBillingAmount = data.noOfSeat * flightData.price;
        const bookingPayload = {...data, totalCost: totalBillingAmount};
        const booking = await bookingRepository.create(bookingPayload, transaction);

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeat

        });
        await transaction.commit();
        
        return booking;
    } catch(error) {
        console.error(error);
        await transaction.rollback();
        throw error;
    }   
}

async function makePayment(data) {
    const transaction = await db.sequelize.transaction();
    try {
        
        const bookingDetails = await bookingRepository.get(data.bookingId, transaction);
        if(bookingDetails.status == CANCELLED) {
            throw new AppError('The booking has expired', StatusCodes.BAD_REQUEST);
        }
        const bookingTime = new Date(bookingDetails.createdAt)
        const currentTime = new Date();
        if(currentTime - bookingTime > 300000) {
            //await bookingRepository.update(data.bookingId, {status: CANCELLED}, transaction)
            await cancelBooking(data.bookingId);
            throw new AppError('The booking has expired', StatusCodes.BAD_REQUEST);
        }
        if(bookingDetails.totalCost != data.totalCost) {
            throw new AppError('The amount of the payment doesnt match', StatusCodes.BAD_REQUEST);
        }
        if(bookingDetails.userId != data.userId) {
            throw new AppError('The user corresponding to the booking doesnt match', StatusCodes.BAD_REQUEST);
        }
        await bookingRepository.update(data.bookingId, {status: BOOKED}, transaction);
        Queue.sendData({
            recepientEmail: 'jappreets4747@gmail.com',
            subject: 'Flight Booked',
            text: `Booking Successfully done for the flight ${data.bookingId}`
        });
        
        await transaction.commit();
        
    }
    catch(error){
        await transaction.rollback();
        throw error;
    }
}

async function cancelBooking(bookingId) {
    const transaction = await db.sequelize.transaction();
    try {
        const bookingDetails = await bookingRepository.get(bookingId, transaction);
        if(bookingDetails.status == CANCELLED) {
            await transaction.commit();
            return true;
        }
        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`, {
            seats: bookingDetails.noOfSeat,
            decrease: 0
        });
        await bookingRepository.update(bookingId, {status: CANCELLED}, transaction);
        await transaction.commit();

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function cancelOldBookings() {
    try {
        const time = new Date(Date.now() - 1000*300);
        const response = await bookingRepository.cancelOldBookings(time);
        return response;
    } catch (error) {
        console.log(error);
        
    }
}
module.exports = {
    createBooking,
    makePayment,
    cancelOldBookings
    
}