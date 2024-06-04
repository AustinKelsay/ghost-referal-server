const prisma = require('../prisma.js');

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
            try {
                // If the referrer exists, try to add the new referee
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
            } catch (error) {
                if (error.code === 'P2002' && error.meta.target.includes('email')) {
                    // Unique constraint violation on the 'email' field
                    // Referee has already been referred by this referrer
                    return { error: 'Referee already exists for this referrer' };
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }

        return referrer;
    } catch (error) {
        console.error('Error creating referral:', error);
        throw error; // Re-throw the error to be caught in the route handler
    }
};

const incrementReferrerSuccessfulReferrals = async (referrerEmail) => {
    try {
      const updatedReferrer = await prisma.referrer.update({
        where: {
          email: referrerEmail,
        },
        data: {
          successfulReferrals: {
            increment: 1,
          },
        },
      });
  
      return updatedReferrer;
    } catch (error) {
      console.error('Error incrementing referrer successful referrals:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
  };

const getAllReferees = async () => {
    try {
      const referees = await prisma.referee.findMany({
        include: {
          referrer: {
            select: {
              email: true,
            },
          },
        },
      });
      return referees;
    } catch (error) {
      console.error('Error fetching referees:', error);
    }
  };

  const getAllUnrewardedReferees = async () => {
    try {
      const unrewardedReferees = await prisma.referee.findMany({
        where: {
          rewarded: false,
        },
        include: {
          referrer: {
            select: {
              email: true,
              successfulReferrals: true,
            },
          },
        },
      });
      return unrewardedReferees;
    } catch (error) {
      console.error('Error fetching unrewarded referees:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
  };

  const refereeRewarded = async (refereeEmail) => {
    console.log('called');
    try {
      const referee = await prisma.referee.update({
        where: {
          email: refereeEmail,
        },
        data: {
          rewarded: true, // Specify the fields to update here
        },
        select: {
          rewarded: true,
        },
      });
  
      if (!referee) {
        return { error: 'Referee not found' };
      }

      console.log('referee', referee);
  
      return { rewarded: referee.rewarded };
    } catch (error) {
      console.error('Error checking referee rewarded status:', error);
      throw error; // Re-throw the error to be caught in the route handler
    }
};

  const deleteReferee = async (refereeEmail) => {
    try {
        // Find the referee to get the referrer ID before deletion
        const referee = await prisma.referee.findUnique({
            where: {
                email: refereeEmail
            }
        });

        if (!referee) {
            return { error: 'Referee not found' };
        }

        // Delete the referee
        await prisma.referee.delete({
            where: {
                email: refereeEmail
            }
        });

        // Optionally, fetch and return the updated list of referees for the referrer to confirm deletion
        const updatedReferrer = await prisma.referrer.findUnique({
            where: {
                id: referee.referrerId
            },
            include: {
                referees: true
            }
        });

        return updatedReferrer;
    } catch (error) {
        console.error('Error deleting referee:', error);
        throw error; // Re-throw the error to be caught in the route handler
    }
};


module.exports = { createReferral, getAllReferees, deleteReferee, getAllUnrewardedReferees, refereeRewarded, incrementReferrerSuccessfulReferrals };