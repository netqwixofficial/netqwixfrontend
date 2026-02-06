import React, { useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { Card, CardHeader, CardBody, Collapse } from "reactstrap";
import { Plus, Minus } from "react-feather";

const faqs = [
  {
    question: "Who are the Experts at NetQwix?",
    answer: (
      <>
        NetQwix Experts are highly qualified professionals in their subject
        areas. They are passionate about their field of expertise and carefully
        vetted by the NetQwix community. Experts’ extensive experience and
        credentials are available by reading their profile. But there is nothing
        like direct feedback from community members who have enjoyed learning
        sessions on NetQwix. Each coach is categorically rated so it is easier
        to select the expert that is best for you.
      </>
    ),
  },
  {
    question: "How do I get started?",
    answer: (
      <>
        After joining at <a href="https://netqwix.com">www.netqwix.com</a>,
        browse Experts by category to find the right one for you. You can review
        each Experts’ profile to read about their teaching style, experience,
        and methods. Many include demo videos of their instruction. From the
        Experts’ profile, you can Book a Session in advance or you can request
        an INSTANT SESSION if your Expert is ‘Online Now’. Once your Expert
        confirms their availability, you will be brought into the LIVE session
        right away.
      </>
    ),
  },
  {
    question: "Uploading Game Footage",
    answer: (
      <>
        You can upload videos that your Expert will be able to go over with you
        during the session. The instructor can also pull up their own library of
        relevant videos and do a comparative analysis live in front of you.
      </>
    ),
  },
  {
    question: "What else should I know?",
    answer: (
      <>
        • <b>Time zones</b> are converted automatically. Experts’ schedules and
        your session times will appear according to your region. <br />• NetQwix
        has a <b>24-hour cancellation policy.</b> You may schedule, reschedule,
        and cancel sessions up to 24 hours before session start time. After the
        24-hour mark, you may not change a scheduled session.
      </>
    ),
  },
  //   {
  //     question: "How does Session recording work?",
  //     answer: (
  //       <>
  //         Sessions on NetQwix can be recorded for later review. The recording process automatically stops when the meeting ends, and the video file is automatically attached to the Session and stored in your locker. You can find the video file(s) by going to the individual Sessions, under the "Saved Sessions" tab. You will receive an email with the subject line “NetQwix Gameplan” along with the name of the expert and the date.
  //         **At the moment, recording can only occur if the Enthusiasts is using a laptop computer.  NetQwix is working on a mobile solution for recording sessions
  //       </>
  //     ),
  //   },
  //   {
  //     question: "Are there gift certificates on NetQwix?",
  //     answer: (
  //       <>
  //        Yes, you can create a <a href="https://www.lessonface.com/give">gift certificate for sessions</a> in any amount on NetQwix here.
  //       </>
  //     ),
  //   },
  {
    question: "How do I start my session?",
    answer: (
      <>
        You will receive a reminder email before your session start time that
        will contain a unique link to the session. You can use that link to join
        the session, or you can log into your NetQwix account and visit
        ‘Bookings’. The Start Button will become active when it is time for your
        session. 5 minutes before your scheduled session, we will text message
        you a reminder along with a link to join the session.
      </>
    ),
  },
  {
    question:
      "Will I be able to rejoin my session if I have connectivity issues or other technical difficulties?",
    answer: (
      <>
        Yes. If you lose your connection, you can rejoin by clicking link again
        or there will an Active Sessions link in your locker with a button to
        rejoin.
      </>
    ),
  },
  {
    question:
      "Will I get a refund if there was bad Internet connection and I was unable to have a successful session?",
    answer: (
      <>
        Yes. If you have a bad experience for any reason, we will refund your
        money. Let us know within two business days of attending the session
        unsuccessfully. We do encourage you to test your set-up before your
        first session, so that you won’t use session time addressing
        connectivity problems. When technical problems arise during a session,
        experts are typically very willing to reschedule and try again. The goal
        is to get you connected and learning, but if it's not possible, you will
        get your money back.
      </>
    ),
  },
  {
    question: "How do I pay my expert on NetQwix?",
    answer: (
      <>
        With a major credit card or Apple Pay or Paypal account. Choose the
        expert and the time under Book a Session and then go through the
        check-out process. The expert is paid after the session has been
        successfully completed.
      </>
    ),
  },
  {
    question: "What equipment do I need to take a session on NetQwix?",
    answer: (
      <>
        Most users will join using their regular smart phone. User may also use
        their computer or tablet with webcams. It's a good idea to have a
        notepad and cold drink close by so you are prepared.
      </>
    ),
  },
  {
    question: "How do I choose a expert on NetQwix?",
    answer: (
      <>
        Go to your locker and click Book Expert on the left hand side. Use the
        search criteria to find the expert who is best matched to your favorite
        sport/activity and to read their profiles. Experts are searchable by
        rating, desired price range, and by availability.
      </>
    ),
  },
  {
    question: "How do I register as a expert?",
    answer: (
      <>
        Click the "Sign Up" button at the top right hand side of the page, use
        your email address to register (not one of the social accounts options)
        and choose the "Expert” option to start the expert application.  You
        will then be asked to select your area of expertise as well as your KYC
        information including information related to paying you.
      </>
    ),
  },
  {
    question: "How will NetQwix help me find students to teach?",
    answer: (
      <>
        Through creating a detailed profile, NetQwix increases the exposure of
        your teaching practice. The site also enables you to establish a clean,
        professional online presence easily and free of charge. Furthermore,
        NetQwix’s customized LIVE SESSION technology and user-friendly
        scheduling system allow you to extend a professional-quality teaching
        studio to your existing clientele.
      </>
    ),
  },
];

function Section({ id, title, subtitle, description, children, className }) {
  const sectionId = title ? title.toLowerCase().replace(/\s+/g, "-") : id;

  return (
    <section id={id || sectionId}>
      <div className={className}>
        <div className="container py-5">
          <div className="text-center mb-5">
            {title && (
              <h2 className="text-uppercase text-primary font-mono font-weight-bold text-muted">
                {title}
              </h2>
            )}
            {subtitle && (
              <h3 className="mt-4 mb-3 h2 font-weight-bold">{subtitle}</h3>
            )}
            {description && (
              <p
                className="mt-4 mx-auto text-muted lead"
                style={{ maxWidth: "650px" }}
              >
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export default function FAQ() {
  const isMobileScreen = useMediaQuery("(max-width: 768px)");
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <Section title="FAQ" subtitle="Frequently asked questions">
      <div className="container my-5">
        <div className="faq-accordion-container">
          {faqs.map((faq, idx) => {
            const isOpen = openItems.has(idx);
            return (
              <Card
                key={idx}
                className="faq-card mb-3"
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <CardHeader
                  className="faq-header"
                  style={{
                    backgroundColor: "#f8f9fa",
                    cursor: "pointer",
                    padding: isMobileScreen ? "15px" : "20px",
                    borderBottom: isOpen ? "1px solid #e0e0e0" : "none",
                  }}
                  onClick={() => toggleItem(idx)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <h5
                      className="mb-0"
                      style={{
                        fontSize: isMobileScreen ? "16px" : "18px",
                        fontWeight: 600,
                        color: "#000080",
                        flex: 1,
                        marginRight: "15px",
                        textAlign: "left",
                      }}
                    >
                      {faq.question}
                    </h5>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "30px",
                        height: "30px",
                        backgroundColor: "#000080",
                        borderRadius: "50%",
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {isOpen ? (
                        <Minus size={18} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <Collapse isOpen={isOpen}>
                  <CardBody
                    style={{
                      padding: isMobileScreen ? "15px" : "20px",
                      fontSize: isMobileScreen ? "14px" : "16px",
                      lineHeight: "1.6",
                      color: "#333",
                    }}
                  >
                    {faq.answer}
                  </CardBody>
                </Collapse>
              </Card>
            );
          })}
        </div>
      </div>
      <h4
        className="text-center text-muted"
        style={{
          fontSize: isMobileScreen ? "16px" : "18px",
          marginTop: "40px",
          padding: isMobileScreen ? "0 15px" : "0",
        }}
      >
        Still have questions? Email us at{" "}
        <a
          href="mailto:phil@netqwix.com"
          className="text-decoration-underline"
          style={{ color: "#000080" }}
        >
          phil[@]netqwix.com
        </a>
      </h4>
    </Section>
  );
}
