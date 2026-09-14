import { db } from './db';
import { intakeCms } from './db/schema';
import { eq } from 'drizzle-orm';

export interface CmsSectionData {
	id: 'hero' | 'about' | 'how_it_works' | 'contact' | 'process_flow' | 'faqs' | 'footer';
	title: string;
	subtitle: string;
	content: any;
	updatedAt: string;
}

export async function getIntakeCmsSections(): Promise<{
	sections: Record<string, CmsSectionData>;
	sectionOrder: string[];
}> {
	const records = await db.select().from(intakeCms);

	const defaults: Record<string, CmsSectionData> = {
		hero: {
			id: 'hero',
			title: 'ATM Payment Processing Solutions',
			subtitle: 'Apply Today, Be In Business Tomorrow!',
			content: {
				badge: 'ATM Payment Processing Solutions',
				tagline: 'THEY DECLINE. WE APPROVE.',
				primaryCta: 'Get Info',
				secondaryCta: 'Book A Call',
				badges: ['PCI Compliance', 'No Credit Check', '24 Hr Settlement']
			},
			updatedAt: new Date().toISOString()
		},
		process_flow: {
			id: 'process_flow',
			title: 'What is an ATM Merchant Account?',
			subtitle:
				"An ATM merchant account isn't a standard bank account but a specialized service allowing businesses to process electronic payments (cards, digital wallets) by acting as a temporary holding account for customer funds before transferring them to your regular business checking account, facilitated by a merchant service provider and an acquiring bank, essential for modern non-cash transactions and often involving fees.",
			content: {
				primaryCta: 'Get Info',
				secondaryCta: 'Book A Call',
				keyPoints: [
					{
						badge: 'Cash Reduction',
						title: 'Smart ATM Payment Solution for Cash-Only Businesses',
						desc: 'Our ATM payment solution is perfect for cash-only businesses as it drastically reduces the amount of cash on hand.',
						tag: 'Drastically reduces cash on hand'
					},
					{
						badge: 'Unlimited Scale',
						title: 'Unlimited ATM machines, Faster Checkouts',
						desc: 'Order as many ATM machines as you need to reduce customer wait times.',
						tag: 'Reduces customer wait times & queues'
					},
					{
						badge: '0% Merchant Cost',
						title: 'Zero Merchant Fees.',
						desc: 'Our ATM payment solution is paid for by the customer. An easy choice when many of our competitors are charging the merchant a percentage of each sale based on transaction volume at an average of 4.95% up to 6% plus flat dollar amount per transaction.',
						tag: 'Save 4.95% to 6% + flat fee per transaction'
					}
				],
				ctaBanner: {
					badge: 'Zero Merchant Fees',
					title: 'Ready to Eliminate Credit Card Processing Fees?',
					subtitle: 'Get an instant customized terminal proposal or schedule a direct consultation with our underwriting team today.',
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call'
				}
			},
			updatedAt: new Date().toISOString()
		},
		about: {
			id: 'about',
			title: 'High-Risk Business Categories',
			subtitle: 'Understanding processor guidelines, risk classification, and high-risk merchant placement.',
			content: {
				description:
					"The first thing to understand about high-risk businesses is that your processor will determine whether you fall into one of their high-risk categories when you apply for a merchant account. Either you’re high-risk, or you’re not – there is no middle ground. Beyond that, it gets complicated as every processor has their own unique guidelines for determining whether you’re in the high-risk category. While some business types, will almost always be placed in the high-risk group, others may or may not be. Some merchant services providers have very strict guidelines for determining high-risk status, while others use more relaxed criteria. If you’re considering a particular provider, check their website or contact them directly to see if they find your business to be high-risk. This can save you a lot of time and effort in wasted applications to providers who aren’t going to approve you.\n\nHow a merchant services provider treats a high-risk business can also vary widely. Many providers, particularly those that try to offer merchant services at the lowest possible prices, simply do not accept any high-risk businesses at all. This helps to reduce their exposure to fraud and keeps costs low for their existing clients. You will find most providers will allow certain high-risk companies, but will charge you significantly higher rates and fees for your merchant account due to the elevated risk they’re accepting by giving you a merchant account. There’s also a third category of providers who specialize in placing high-risk businesses. While their rates and fees aren’t a good deal for non-high-risk merchants, they can often provide a merchant account for high-risk businesses that have been turned down by other providers.",
				transitionNotice:
					"We’re always just a phone call away and are more than happy to answer any of your questions, but here are a few questions that we get asked all the time."
			},
			updatedAt: new Date().toISOString()
		},
		how_it_works: {
			id: 'how_it_works',
			title: 'NBMS Pin Debit Cashless ATM Terminals',
			subtitle: 'State-of-the-art EMV & PCI compliant payment terminals engineered for countertop checkout, home delivery, and zero merchant fees.',
			content: {
				hideSection: false,
				features: [
					{
						title: '$5.00 Increment Pin Debit System',
						desc: 'Countertop cashless ATM terminals processing transactions smoothly in $5 increment steps.'
					},
					{
						title: 'EMV & PCI-Compliant Hardware',
						desc: 'Next-gen secure terminal hardware equipped with tap, chip, and PIN encryption at industry-leading wholesale pricing.'
					},
					{
						title: 'Direct Bank Deposits & Less Cash Handling',
						desc: 'Daily automated settlements directly to your bank account, keeping cash on hand low and eliminating theft risks.'
					},
					{
						title: 'Zero Merchant Processing Costs',
						desc: 'Eliminates merchant transaction fees with transparent, ultra-low consumer convenience fees.'
					},
					{
						title: 'Higher Ticket Size & Customer Experience',
						desc: 'Frictionless checkout experience that elevates customer satisfaction and yields higher average sales.'
					},
					{
						title: 'In-Store & Home Delivery Mobility',
						desc: 'Portable wireless terminals engineered for retail counters, mobile popup shops, and home delivery services.'
					},
					{
						title: 'Customizable $500 Limit Caps',
						desc: 'Merchants choose custom purchase dollar limits up to $500.00 directly from their admin portal.'
					},
					{
						title: 'Real-Time Settlement Reporting',
						desc: 'Specialized merchant login for live customized reporting on settlements, batches, and transactions.'
					},
					{
						title: '24/7 Priority Support',
						desc: 'Around-the-clock technical assistance and underwriting support whenever you need help.'
					}
				],
				hardwareCta: {
					title: 'Ready to Upgrade Your Checkout Hardware?',
					subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
					primaryCta: 'Get Terminal Proposal',
					secondaryCta: 'Book Equipment Demo'
				},
				servicesSection: {
					title: 'Complete In-House ATM Solutions',
					subtitle1: 'From ATM processing to equipment, we offer a comprehensive set of solutions designed to streamline day-to-day business operations and increase your revenues.',
					subtitle2: 'From authorization to settlement, we efficiently handle the lifecycle of each transaction to ensure each is both valid and secure while providing comprehensive reporting with instant visibility of your ATM transactions.',
					topBadges: [
						{ title: '24 Hour Account Approval' },
						{ title: 'High Approval Rate' },
						{ title: 'Dedicated Billing Descriptors' },
						{ title: 'Transparent Underwriting' }
					],
					checklist: [
						'ATM hardware',
						'ATM compliance',
						'Secure, real time transaction processing',
						'ATM management platform',
						'Powerful reporting tools',
						'24/7 support'
					]
				}
			},
			updatedAt: new Date().toISOString()
		},
		contact: {
			id: 'contact',
			title: 'Merchant Support & Priority Assistance',
			subtitle: 'Our dedicated account management team is here to answer all your processing questions.',
			content: {
				hideSection: false,
				email: 'sales@nbmsinc.com',
				phone: '(877) 817-2257',
				hours: 'Mon - Sun: 24/7 Priority Desk',
				helpNotice: 'Ready to get started or compare your current rates? Reach out to our underwriting team today.'
			},
			updatedAt: new Date().toISOString()
		},
		faqs: {
			id: 'faqs',
			title: 'Frequently Asked Questions',
			subtitle: 'Everything you need to know about ATM processing, high-risk approval, PCI security, and settlements.',
			content: {
				hideSection: false,
				items: [
					{
						question: 'What are cashless ATMs and how are they being used?',
						answer: 'A cashless ATM is very similar to a regular ATM where cardholders can request funds using their debit card and 4 digit PIN. However, instead of receiving cash, they will receive a receipt from the merchant. The merchant will receive the funds via ACH, comparable to debit and credit card payment systems, and the customer can avoid having to take out cash from a stand alone ATM.'
					},
					{
						question: 'Why Choose a Cashless ATM?',
						answer: 'NBMS created a payment processing solution that would allow high risk types of establishments to accept card payments, simplify the checkout experience for customers, and provide greater security by reducing the large amounts of cash being held and handled on location by these merchants.'
					},
					{
						question: 'Tired of submitting applications and not getting approved?',
						answer: 'We guarantee you’ll get approved with our cashless ATM solution within 24-48 business hours. Furthermore, there’s no risk of getting placed on the TMF/Match list by utilizing these services since you’re accepting transactions on the ATM rails, no different than your traditional ATM! Already on the TMF list? Then, give us a call, and we’ll help you start accepting cashless payments once again without paying significant fees.'
					},
					{
						question: 'How long does the approval and shipping process take?',
						answer: 'Once we receive the required documents and application for approval, we’ll be able to get you approved within 24 business hours. Once the approval and programming process is complete the terminal is shipped, and the unit will arrive as an “out of the box solution!”'
					},
					{
						question: 'When can I expect the funds in my account?',
						answer: 'Payments are real-time and funds are deposited into your bank account the next day. You’ll receive a FREE online portal to view all sales on a real time daily/weekly/monthly basis as well.'
					},
					{
						question: 'Who do I contact for support?',
						answer: 'We not only provide support from our US based support teams, but we always recommend contacting your NBMS Agent first. We constantly focus on building longstanding partnerships with each one of our Merchants plus we know more about your account than anyone else. Always contact your Agent first and they’ll take care of you. Plus, each terminal is backed with a one year manufacturer’s warranty, so if they break we will replace them.'
					},
					{
						question: 'How am I able to accept card purchases with this solution?',
						answer: 'Cashless ATM transactions are considered ATM withdrawals. The card must be present, and the four-digit pin number must be entered correctly in order for the transaction to get approved.'
					},
					{
						question: 'Are there any additional Cashless ATM Perks?',
						answer: '• Receive a state-of-the-art terminals (includes storefront and wireless units).\n• NO personal information or financial documents required for approval. We simply need the standard KYC requirements for any merchant application.\n• Card present pin-based transactions effectively reduce chargebacks (customer disputes) or the chance of fraudulent transactions.\n• Unlike a traditional merchant account, there are NO rates or fees for any Cashless ATM transaction. The Cashless ATM transaction cost is charged to the customer in the form of an ATM fee saving your business hundreds, if not thousands of dollars every month!\n• There is peace of mind and sense of security for all parties involved as these transactions are handled in a cashless manner.\n• Incremental transactions allow your employees to receive additional tips (helps reduce employee attrition).\n• Installation is easy. Simply plug the units in (or power on the wireless units) and you are ready to process, but we’re always on standby for any ongoing assistance.\n• Transactions are discreet. Shown as ATM withdrawals on your customers bank statements.'
					}
				]
			},
			updatedAt: new Date().toISOString()
		},
		footer: {
			id: 'footer',
			title: 'Footer Section',
			subtitle: 'Footer call to action banner and footer links.',
			content: {
				ctaBanner: {
					title: 'Ready to Get Started with NBMS?',
					subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call'
				},
				copyright: '© 2026 NBMS INC. All rights reserved.'
			},
			updatedAt: new Date().toISOString()
		}
	};

	const defaultOrder = ['hero', 'process_flow', 'how_it_works', 'about', 'contact', 'faqs', 'footer'];
	let sectionOrder = [...defaultOrder];

	for (const rec of records) {
		if (rec.id === 'section_order') {
			try {
				const parsed = JSON.parse(rec.contentJson);
				if (parsed && Array.isArray(parsed.order) && parsed.order.length > 0) {
					const validIds = ['hero', 'how_it_works', 'process_flow', 'about', 'contact', 'faqs', 'footer'];
					const savedOrder = parsed.order.filter((id: string) => validIds.includes(id));
					for (const validId of validIds) {
						if (!savedOrder.includes(validId)) {
							savedOrder.push(validId);
						}
					}
					sectionOrder = savedOrder;
				}
			} catch (e) {
				console.error('Failed to parse section_order JSON', e);
			}
			continue;
		}

		try {
			if (rec.id === 'hero' && rec.title.toLowerCase().includes('merchant setup')) {
				rec.title = 'ATM Payment Processing Solutions';
			}

			const parsedContent = JSON.parse(rec.contentJson);

			defaults[rec.id] = {
				id: rec.id as any,
				title: rec.title,
				subtitle: rec.subtitle || '',
				content: { ...defaults[rec.id]?.content, ...parsedContent },
				updatedAt: rec.updatedAt
			};
		} catch (e) {
			console.error(`Failed to parse CMS JSON for section ${rec.id}`, e);
		}
	}

	return {
		sections: defaults,
		sectionOrder
	};
}

export async function updateCmsSection(id: string, title: string, subtitle: string, content: any) {
	const now = new Date().toISOString();
	const contentJson = JSON.stringify(content);

	const [updated] = await db
		.insert(intakeCms)
		.values({
			id,
			title,
			subtitle,
			contentJson,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: intakeCms.id,
			set: {
				title,
				subtitle,
				contentJson,
				updatedAt: now
			}
		})
		.returning();

	return updated;
}
