'use server';

import { WebinarFormState } from '@/store/useWebinarStore';
import { WebinarStatusEnum } from '@prisma/client';
import { onAuthenticateUser } from './auth';
import { prismaClient } from '@/lib/prismaClient';
import { CtaTypeEnum } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type WebinarData = {
  title: string;
  description: string;
  thumbnail: string;
  startTime: Date;
  tags: string[];
  ctaLabel: string;
  ctaType: CtaTypeEnum;
  aiAgentId: string | null;
  lockChat: boolean;
  couponCode: string | null;
  priceId: string | null;
  couponEnabled: boolean;
  presenterId?: string;
};

function combineDateTime(
  date: Date,
  timeStr: string,
  timeFormat: 'AM' | 'PM',
): Date {
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr || '0', 10);

  if (timeFormat === 'PM' && hours < 12) {
    hours += 12;
  } else if (timeFormat === 'AM' && hours === 12) {
    hours = 0;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export const createWebinar = async (formData: WebinarFormState) => {
  try {
    const user = await onAuthenticateUser();
    if (!user) {
      return { status: 401, message: 'Unauthorized' };
    }

    if (!user.user?.subscription) {
      return { status: 402, message: 'Subscription Required' };
    }

    const presenterId = user.user?.id;
    console.log('Form Data', formData, presenterId);

    if (formData.cta.ctaType === 'BOOK_A_CALL') {
      if (user.user.bookACallWebinarsLimit <= 0) {
        return {
          status: 400,
          message:
            'You have reached your limit for Book-a-Call webinars. Please upgrade your plan.',
        };
      }
    }

    if (!formData.basicInfo.webinarName) {
      return { status: 400, message: 'Webinar Name is required' };
    }

    if (!formData.basicInfo.date) {
      return { status: 400, message: 'Webinar Date is required' };
    }

    if (!formData.basicInfo.time) {
      return { status: 400, message: 'Webinar Time is required' };
    }

    const combinedDataTime = combineDateTime(
      formData.basicInfo.date,
      formData.basicInfo.time,
      formData.basicInfo.timeFormat || 'AM',
    );
    // const now = new Date();

    // if (combinedDataTime < now) {
    //   return {
    //     status: 400,
    //     message: 'Webinar Date and Time must be in the future',
    //   };
    // }

    const data: WebinarData = {
      title: formData.basicInfo.webinarName,
      description: formData.basicInfo.description || '',
      thumbnail: formData.basicInfo.thumbnail || '',
      startTime: combinedDataTime,
      tags: formData.cta.tags || [],
      ctaLabel: formData.cta.ctaLabel || '',
      ctaType: formData.cta.ctaType as CtaTypeEnum,
      aiAgentId: formData.cta.aiAgent || null,
      lockChat: formData.additionalInfo.lockChat || false,
      couponCode: formData.additionalInfo.couponEnabled
        ? formData.additionalInfo.couponCode ?? null
        : null,
      priceId: formData.cta.priceId || null,
      couponEnabled: formData.additionalInfo.couponEnabled || false,
    };

    const result = await prismaClient.$transaction(async (tx) => {
      const webinar = await tx.webinar.create({
        data: {
          ...data,
          presenterId: presenterId!,
        },
      });

      if (formData.cta.ctaType === 'BOOK_A_CALL') {
        await tx.user.update({
          where: {
            id: presenterId!,
          },
          data: {
            bookACallWebinarsLimit: {
              decrement: 1,
            },
          },
        });
      }

      return webinar;
    });

    revalidatePath('/');
    return {
      status: 200,
      message: 'Webinar created successfully',
      webinarId: result.id,
      webinarLink: `/webinar/${result.id}`,
    };
  } catch (error) {
    console.error('Error creating webinar:', error);
    return { status: 500, message: 'Failed to create webinar' };
  }
};

export const updateWebinar = async (
  webinarId: string,
  formData: WebinarFormState,
) => {
  try {
    const user = await onAuthenticateUser();
    if (!user) {
      return { status: 401, message: 'Unauthorized' };
    }

    if (!user.user?.subscription) {
      return { status: 402, message: 'Subscription Required' };
    }

    const presenterId = user.user?.id;
    console.log('Update Form Data', formData, presenterId, webinarId);

    const existingWebinar = await prismaClient.webinar.findUnique({
      where: {
        id: webinarId,
      },
    });

    if (!existingWebinar) {
      return { status: 404, message: 'Webinar not found' };
    }

    if (existingWebinar.presenterId !== presenterId) {
      return {
        status: 403,
        message: 'Forbidden: You can only update your own webinars',
      };
    }

    const isChangingToBooKACall =
      existingWebinar.ctaType !== 'BOOK_A_CALL' &&
      formData.cta.ctaType === 'BOOK_A_CALL';

    if (isChangingToBooKACall && user.user.bookACallWebinarsLimit <= 0) {
      return {
        status: 400,
        message:
          'You have reached your limit for Book-a-Call webinars. Please upgrade your plan.',
      };
    }

    if (!formData.basicInfo.webinarName) {
      return { status: 400, message: 'Webinar Name is required' };
    }

    if (!formData.basicInfo.date) {
      return { status: 400, message: 'Webinar Date is required' };
    }

    if (!formData.basicInfo.time) {
      return { status: 400, message: 'Webinar Time is required' };
    }

    const combinedDataTime = combineDateTime(
      formData.basicInfo.date,
      formData.basicInfo.time,
      formData.basicInfo.timeFormat || 'AM',
    );

    const updateData: WebinarData = {
      title: formData.basicInfo.webinarName,
      description: formData.basicInfo.description || '',
      thumbnail: formData.basicInfo.thumbnail || '',
      startTime: combinedDataTime,
      tags: formData.cta.tags || [],
      ctaLabel: formData.cta.ctaLabel || 'Webinar',
      ctaType: formData.cta.ctaType as CtaTypeEnum,
      aiAgentId: formData.cta.aiAgent || null,
      lockChat: formData.additionalInfo.lockChat || false,
      couponCode: formData.additionalInfo.couponEnabled
        ? formData.additionalInfo.couponCode ?? null
        : null,
      priceId: formData.cta.priceId || null,
      couponEnabled: formData.additionalInfo.couponEnabled || false,
    };

    // Use transaction to update webinar and user limit
    const result = await prismaClient.$transaction(async (tx) => {
      // Update the webinar
      const updatedWebinar = await tx.webinar.update({
        where: {
          id: webinarId,
        },
        data: updateData,
      });

      // Handle limit changes based on CTA type changes
      if (
        existingWebinar.ctaType === 'BOOK_A_CALL' &&
        formData.cta.ctaType !== 'BOOK_A_CALL'
      ) {
        // Changed from BOOK_A_CALL to something else - refund the limit
        await tx.user.update({
          where: {
            id: presenterId!,
          },
          data: {
            bookACallWebinarsLimit: {
              increment: 1,
            },
          },
        });
      } else if (isChangingToBooKACall) {
        // Changed to BOOK_A_CALL - decrement the limit
        await tx.user.update({
          where: {
            id: presenterId!,
          },
          data: {
            bookACallWebinarsLimit: {
              decrement: 1,
            },
          },
        });
      }

      return updatedWebinar;
    });

    revalidatePath('/');
    revalidatePath(`/webinar/${webinarId}`);

    return {
      status: 200,
      message: 'Webinar updated successfully',
      webinarId: result.id,
      webinarLink: `/webinar/${result.id}`,
      data: result,
    };
  } catch (error) {
    console.error('Error updating webinar:', error);
    return { status: 500, message: 'Failed to update webinar' };
  }
};

export const getWebinarByPresenterId = async (
  presenterId: string,
  webinarStatus?: string,
) => {
  try {
    let statusFilter: WebinarStatusEnum | undefined;

    switch (webinarStatus) {
      case 'upcoming':
        statusFilter = WebinarStatusEnum.SCHEDULED;
        break;
      case 'ended':
        statusFilter = WebinarStatusEnum.ENDED;
        break;
      default:
        statusFilter = undefined;
    }

    const webinars = await prismaClient.webinar.findMany({
      where: {
        presenterId: presenterId,
        webinarStatus: statusFilter,
      },
      include: {
        presenter: {
          select: {
            id: true,
            stripeConnectId: true,
            email: true,
          },
        },
      },
    });
    return webinars;
  } catch (error) {
    console.error('Error fetching webinars:', error);
    return [];
  }
};

export async function getWebinarById(webinarId: string) {
  try {
    const webinar = prismaClient.webinar.findUnique({
      where: {
        id: webinarId,
      },
      include: {
        presenter: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            stripeConnectId: true,
            email: true,
          },
        },
      },
    });

    return webinar;
  } catch (error) {
    console.error('Error fetching webinar by ID:', error);
    throw new Error('Webinar not found');
  }
}

export async function changeWebinarStatus(
  webinarId: string,
  status: WebinarStatusEnum,
) {
  try {
    const webinar = await prismaClient.webinar.update({
      where: {
        id: webinarId,
      },
      data: {
        webinarStatus: status,
      },
    });
    return {
      status: 200,
      success: true,
      message: 'Webinar status updated successfully',
      data: webinar,
    };
  } catch (error) {
    console.error('Error updating webinar status:', error);
    return {
      status: 500,
      success: false,
      message: 'Failed to update webinar status',
    };
  }
}

export const deleteWebinar = async (webinarId: string) => {
  try {
    const webinar = await prismaClient.webinar.delete({
      where: {
        id: webinarId,
      },
    });
    return {
      status: 200,
      success: true,
      message: 'Webinar deleted successfully',
      data: webinar,
    };
  } catch (error) {
    console.error('Error deleting webinar status:', error);
    return {
      status: 500,
      success: false,
      message: 'Failed to delete webinar',
    };
  }
};

export const countWebinars = async (presenterId: string) => {
  try {
    const count = await prismaClient.webinar.count({
      where: {
        presenterId: presenterId,
      },
    });

    return {
      status: 200,
      success: true,
      message: 'Webinars counted successfully',
      count: count,
    };
  } catch (error) {
    console.error('Error counting webinars:', error);
    return {
      status: 500,
      success: false,
      message: 'Failed to count webinars',
      count: 0,
    };
  }
};
