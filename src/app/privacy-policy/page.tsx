export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🔒 Privacy Policy
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          Last Updated: {new Date().toLocaleDateString("en-IN")}
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Information We Collect
            </h2>

            <p>
              We may collect certain information from users to provide,
              maintain, and improve our services.
            </p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>Personal Information:</strong> Name, phone number,
                email address, and other information provided by the user.
              </li>

              <li>
                <strong>Appointment Information:</strong> Appointment date,
                time, selected service, doctor, and related booking details.
              </li>

              <li>
                <strong>Communication Information:</strong> Messages,
                inquiries, and information submitted through WhatsApp,
                website forms, or other communication channels.
              </li>

              <li>
                <strong>Payment Information:</strong> Payment transactions
                may be processed securely through third-party payment
                providers such as Razorpay. We do not store complete
                card or banking credentials on our servers.
              </li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. How We Use Your Information
            </h2>

            <p>We may use collected information to:</p>

            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Provide and manage our services.</li>
              <li>Process and manage appointments.</li>
              <li>Respond to customer inquiries and requests.</li>
              <li>Send appointment confirmations and reminders.</li>
              <li>Process payments through authorized payment providers.</li>
              <li>Improve our services, website, and customer experience.</li>
              <li>Maintain security and prevent fraudulent activity.</li>
            </ul>
          </section>

          {/* 3. WhatsApp */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. WhatsApp Communication
            </h2>

            <p>
              If you communicate with us through WhatsApp, we may process
              your WhatsApp phone number and messages in order to provide
              customer support, appointment management, notifications,
              and other requested services.
            </p>

            <p className="mt-3">
              WhatsApp communications may be processed through Meta's
              WhatsApp Business Platform and related service providers.
            </p>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Sharing of Information
            </h2>

            <p>
              We do not sell or rent personal information to third parties.
              Information may be shared with trusted service providers only
              when necessary to operate our services, process payments,
              provide communication services, maintain infrastructure,
              or comply with applicable laws.
            </p>
          </section>

          {/* 5. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Data Security
            </h2>

            <p>
              We take reasonable technical and organizational measures to
              protect user information against unauthorized access,
              alteration, disclosure, or destruction. However, no method
              of electronic transmission or storage can be guaranteed to
              be completely secure.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Data Retention
            </h2>

            <p>
              We retain personal information only for as long as reasonably
              necessary to provide our services, maintain business records,
              resolve disputes, comply with legal obligations, and enforce
              our agreements.
            </p>
          </section>

          {/* 7. User Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Your Rights
            </h2>

            <p>
              Depending on applicable law, you may request access to,
              correction of, or deletion of your personal information.
              You may also contact us regarding questions about how your
              information is processed.
            </p>
          </section>

          {/* 8. Third Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Third-Party Services
            </h2>

            <p>
              Our services may use third-party platforms and service
              providers, including payment, hosting, communication,
              analytics, and infrastructure providers. These providers
              may process information according to their own privacy
              policies and applicable laws.
            </p>
          </section>

          {/* 9. Policy Updates */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Changes to This Privacy Policy
            </h2>

            <p>
              We may update this Privacy Policy from time to time. Any
              changes will be posted on this page with an updated
              "Last Updated" date.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Contact Us
            </h2>

            <div className="mt-3 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:skfirdous1111@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  skfirdous1111@gmail.com
                </a>
              </p>

              <p className="mt-2">
                <strong>Phone:</strong>{" "}
                <a
                  href="tel:+918250778707"
                  className="text-blue-600 hover:underline"
                >
                  +91 82507 78707
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            By using our services, you acknowledge that you have read
            and understood this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
