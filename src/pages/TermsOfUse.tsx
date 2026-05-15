import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="mb-8">
          <Link to="/auth" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Terms of Use</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By registering for an account or logging into the Co-op Society Portal, you agree to be bound by these Terms of Use. If you do not agree, do not access the portal.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Access to the Ledger</h2>
            <p>The Co-op Society Portal provides members with access to view their savings, shares, loan status, and transaction history. Access is strictly limited to your own data, and administrative access is restricted to authorized personnel. You are responsible for keeping your login credentials confidential.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data Accuracy Obligations</h2>
            <p>The ledger reflects the official records maintained by the Co-op Society. While we strive for complete accuracy, occasional discrepancies may occur during data synchronization. By using this portal, you agree to report any suspected discrepancies promptly to the society's administrators with supporting evidence (such as receipts). The society's official bank records shall be the final authority in any dispute.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. User Conduct</h2>
            <p>As a member, you agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Attempt to gain unauthorized access to other members' records or administrative functions.</li>
              <li>Use the portal for any fraudulent or illegal activities.</li>
              <li>Interfere with or disrupt the security, stability, or performance of the portal.</li>
              <li>Upload malicious files or exploit any vulnerability in the system.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Compliance with External Vendors</h2>
            <p>The Co-op Society Portal may integrate with third-party software vendors, hosting providers, or identity services. By using the portal, you agree to comply with the acceptable use policies of these vendors. The Co-op Society is not liable for service interruptions caused by external infrastructure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Modifications to Terms</h2>
            <p>We reserve the right to update or modify these Terms of Use at any time. Continued use of the portal after such changes indicates your acceptance of the updated terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
