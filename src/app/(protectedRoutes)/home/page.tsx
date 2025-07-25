import { FaShoppingBag } from 'react-icons/fa';
import { IoCreateSharp } from 'react-icons/io5';
import OnBoarding from './_components/OnBoarding';
import FeatureCard from './_components/FeatureCard';
import FeatureSectionLayout from './_components/FeatureSectionLayout';
import {
  AIAgentsContent,
  SettingsContent,
} from './_components/ExtraComponents';
import { redirect } from 'next/navigation';
import { onAuthenticateUser } from '@/actions/auth';
import { countWebinars } from '@/actions/webinar';
import { calculateRevenue, countProducts } from '@/actions/product';

const page = async () => {
  const userExist = await onAuthenticateUser();

  if (!userExist?.user) {
    redirect('/sign-in');
  }

  const totalWebinars = await countWebinars(userExist.user.id);
  const totalProducts = await countProducts(userExist.user.id);
  const RevenueCount = await calculateRevenue(userExist.user.id);

  return (
    <div className="w-full mx-auto h-full px-2 sm:px-4">
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-10">
        <div className="space-y-3 sm:space-y-5">
          <h2 className="text-primary font-medium text-xl sm:text-2xl ubuntu-medium">
            Make your webinars a powerful selling machine
          </h2>
          <OnBoarding />
        </div>
        <div className="flex gap-1 sm:gap-3 lg:gap-5 w-full justify-evenly items-center">
          <FeatureCard
            Icon={<FaShoppingBag className="w-5 h-5 sm:w-10 sm:h-10" />}
            heading="Create products and attach them to your webinars"
            smHeading="Products"
            link="/products"
          />
          <FeatureCard
            Icon={<IoCreateSharp className="w-5 h-5 sm:w-10 sm:h-10" />}
            heading="Host webinars and boost your business like never before"
            smHeading="Webinars"
            link="/webinars"
          />
        </div>
      </div>

      <div className="mt-5 sm:mt-7 2xl:mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl bg-background-10">
        <FeatureSectionLayout
          heading="Understand user intent and customize your AI agents accordingly"
          link="/ai-agents"
        >
          <AIAgentsContent />
        </FeatureSectionLayout>

        <FeatureSectionLayout
          heading="Manage your Webinars, Products and add demo Stripe integration"
          link="/settings"
        >
          <SettingsContent
            totalWebinars={totalWebinars.count}
            stripeId={userExist.user.stripeConnectId}
            totalProducts={totalProducts.count}
            revenue={RevenueCount.revenue}
          />
        </FeatureSectionLayout>
      </div>
    </div>
  );
};

export default page;
