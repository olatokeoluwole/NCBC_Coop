import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="mb-8">
          <Link to="/auth" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>To provide you with access to the Co-op Society Portal, we collect and process your personal and financial information. This includes your name, email address, transaction history, savings balances, share capital, and loan records. We may also collect technical data such as your IP address and login timestamps for security purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Data</h2>
            <p>Your data is used exclusively to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Authenticate your identity and provide secure access to your account.</li>
              <li>Display your personal ledger, transaction history, and financial standing.</li>
              <li>Process administrative updates to your balances based on official society records.</li>
              <li>Send critical account alerts or communications related to the society.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. Access to the database is strictly limited to authorized administrative personnel and secured via encryption and robust authentication protocols.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Sharing and Third Parties</h2>
            <p>Your personal and financial data is strictly confidential. We do not sell, rent, or trade your information to third parties. Data may be processed by secure cloud infrastructure providers solely for the purpose of hosting the application, in compliance with applicable Data Protection regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Your Data Rights</h2>
            <p>Under Data Protection regulations, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction of any inaccurate or incomplete data via the society administrators.</li>
              <li>Request deletion of your account (subject to the society's record-keeping obligations for financial transactions).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact Information</h2>
            <p>If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact the Co-op Society administraton team directly.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
