const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createReferral = async (referrerName, referrerEmail, refereeEmail) => {
    try {
        // Check if the referrer already exists
        let referrer = await prisma.referrer.findUnique({
            where: {
                email: referrerEmail
            }
        });

        // If the referrer does not exist, create them
        if (!referrer) {
            referrer = await prisma.referrer.create({
                data: {
                    name: referrerName,
                    email: referrerEmail,
                    referees: {
                        create: {
                            email: refereeEmail
                        }
                    }
                },
                include: {
                    referees: true, // Include the referees in the returned object
                }
            });
        } else {
            // If the referrer exists, just add the new referee
            await prisma.referee.create({
                data: {
                    email: refereeEmail,
                    referrerId: referrer.id
                }
            });

            // Retrieve the referrer with the updated referees list
            referrer = await prisma.referrer.findUnique({
                where: {
                    email: referrerEmail
                },
                include: {
                    referees: true
                }
            });
        }

        return referrer;
    } catch (error) {
        console.error('Error creating referral:', error);
    }
}

module.exports = { createReferral };