import { db } from './db';
import { intakeCms, verticals } from './db/schema';
import { eq, or, sql } from 'drizzle-orm';

export type CmsTemplateType = 'hero' | 'about' | 'how_it_works' | 'contact' | 'process_flow' | 'faqs' | 'footer';

export interface CmsSectionData {
	id: string;
	title: string;
	subtitle: string;
	content: any;
	updatedAt: string;
}

export async function getIntakeCmsSections(verticalId: string = 'mmj-dispensary'): Promise<{
	sections: Record<string, CmsSectionData>;
	sectionOrder: string[];
	verticalName?: string;
}> {
	const targetVerticalId = (verticalId || 'mmj-dispensary').toLowerCase();

	// Query records for this vertical or legacy un-prefixed records if mmj-dispensary
	const records = await db
		.select()
		.from(intakeCms)
		.where(
			targetVerticalId === 'mmj-dispensary'
				? or(
					eq(intakeCms.verticalId, 'mmj-dispensary'),
					sql`${intakeCms.id} NOT LIKE '%__%'`
				)
				: or(
					eq(intakeCms.verticalId, targetVerticalId),
					sql`${intakeCms.id} LIKE ${targetVerticalId + '__%'}`
				)
		);

	// Fetch vertical info if available
	const [vInfo] = await db.select().from(verticals).where(eq(verticals.id, targetVerticalId));
	const verticalName = vInfo?.name || (targetVerticalId === 'mmj-dispensary' ? 'MMJ Dispensary' : targetVerticalId);

	const defaultHeroBg = targetVerticalId === 'mmj-dispensary' ? '/images/tfi_hero_bg.jpg' : '/images/tribal_hero_bg.jpg';

	const defaults: Record<string, CmsSectionData> = {
		hero: {
			id: 'hero',
			title: 'ATM Payment Processing Solutions',
			subtitle: 'Apply Today, Be In Business Tomorrow!',
			content: {
				templateType: 'hero',
				sectionName: 'Hero Section',
				badge: 'ATM Payment Processing Solutions',
				tagline: 'THEY DECLINE. WE APPROVE.',
				primaryCta: 'Get Info',
				secondaryCta: 'Book A Call',
				bgImage: defaultHeroBg,
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
				templateType: 'process_flow',
				sectionName: 'Process Flow & Key Points',
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
				templateType: 'about',
				sectionName: 'About Section',
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
				templateType: 'how_it_works',
				sectionName: 'Product Showcase & Services',
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
				templateType: 'contact',
				sectionName: 'Contact & Support',
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
				templateType: 'faqs',
				sectionName: 'FAQs Accordion',
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
				templateType: 'footer',
				sectionName: 'Footer & Final CTA',
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
	let hasSavedOrder = false;
	let savedOrderList: string[] = [];

	for (const rec of records) {
		const rawSectionId = rec.sectionId || rec.id.replace(/^.+__/, '');
		if (rawSectionId === 'section_order') {
			try {
				const parsed = JSON.parse(rec.contentJson);
				if (parsed && Array.isArray(parsed.order) && parsed.order.length > 0) {
					hasSavedOrder = true;
					savedOrderList = parsed.order;
				}
			} catch (e) {
				console.error('Failed to parse section_order JSON', e);
			}
			continue;
		}

		try {
			if (rawSectionId === 'hero' && rec.title.toLowerCase().includes('merchant setup')) {
				rec.title = 'ATM Payment Processing Solutions';
			}

			const parsedContent = JSON.parse(rec.contentJson);
			const inferredTemplateType: CmsTemplateType = (
				parsedContent.templateType || (
					rawSectionId.startsWith('hero') ? 'hero' :
						rawSectionId.startsWith('process_flow') ? 'process_flow' :
							rawSectionId.startsWith('how_it_works') ? 'how_it_works' :
								rawSectionId.startsWith('about') ? 'about' :
									rawSectionId.startsWith('contact') ? 'contact' :
										rawSectionId.startsWith('faqs') ? 'faqs' :
											rawSectionId.startsWith('footer') ? 'footer' : 'about'
				)
			);

			const defaultNameMap: Record<string, string> = {
				hero: 'Hero Section',
				process_flow: 'Process Flow & Key Points',
				how_it_works: 'Product Showcase & Services',
				about: 'About Section',
				contact: 'Contact & Support',
				faqs: 'FAQs Accordion',
				footer: 'Footer & Final CTA'
			};

			const inferredSectionName = parsedContent.sectionName || defaultNameMap[inferredTemplateType] || 'Custom Section';

			defaults[rawSectionId] = {
				id: rawSectionId,
				title: rec.title,
				subtitle: rec.subtitle || '',
				content: {
					templateType: inferredTemplateType,
					sectionName: inferredSectionName,
					...defaults[rawSectionId]?.content,
					...parsedContent
				},
				updatedAt: rec.updatedAt
			};
		} catch (e) {
			console.error(`Failed to parse CMS JSON for section ${rec.id}`, e);
		}
	}

	if (hasSavedOrder) {
		const existingIds = new Set<string>();
		for (const rec of records) {
			const rawSectionId = rec.sectionId || rec.id.replace(/^.+__/, '');
			if (rawSectionId !== 'section_order') {
				existingIds.add(rawSectionId);
			}
		}
		for (const k of Object.keys(defaults)) {
			existingIds.add(k);
		}

		const validSaved = savedOrderList.filter((id) => existingIds.has(id));
		for (const id of defaultOrder) {
			if (!validSaved.includes(id)) {
				validSaved.push(id);
			}
		}
		for (const id of existingIds) {
			if (!validSaved.includes(id)) {
				validSaved.push(id);
			}
		}
		sectionOrder = validSaved;
	} else {
		for (const id of Object.keys(defaults)) {
			if (id !== 'section_order' && !sectionOrder.includes(id)) {
				sectionOrder.push(id);
			}
		}
	}

	return {
		sections: defaults,
		sectionOrder,
		verticalName
	};
}

export async function updateCmsSection(
	arg1: string,
	arg2: string,
	arg3: string,
	arg4: any,
	arg5?: any
) {
	let verticalId = 'mmj-dispensary';
	let sectionId = arg1;
	let title = arg2;
	let subtitle = arg3;
	let content = arg4;

	if (arg5 !== undefined) {
		verticalId = arg1 || 'mmj-dispensary';
		sectionId = arg2;
		title = arg3;
		subtitle = arg4 || '';
		content = arg5;
	}

	const now = new Date().toISOString();
	const contentJson = JSON.stringify(content);
	const compoundId = `${verticalId}__${sectionId}`;

	const [updated] = await db
		.insert(intakeCms)
		.values({
			id: compoundId,
			verticalId,
			sectionId,
			title,
			subtitle,
			contentJson,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: intakeCms.id,
			set: {
				verticalId,
				sectionId,
				title,
				subtitle,
				contentJson,
				updatedAt: now
			}
		})
		.returning();

	// If mmj-dispensary, also update legacy row for compatibility
	if (verticalId === 'mmj-dispensary') {
		await db
			.insert(intakeCms)
			.values({
				id: sectionId,
				verticalId: 'mmj-dispensary',
				sectionId,
				title,
				subtitle,
				contentJson,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: intakeCms.id,
				set: {
					verticalId: 'mmj-dispensary',
					sectionId,
					title,
					subtitle,
					contentJson,
					updatedAt: now
				}
			});
	}

	return updated;
}

export async function duplicateCmsSection(verticalId: string = 'mmj-dispensary', sourceSectionId: string) {
	const targetVerticalId = (verticalId || 'mmj-dispensary').toLowerCase();
	const { sections, sectionOrder } = await getIntakeCmsSections(targetVerticalId);

	const sourceSection = sections[sourceSectionId];
	if (!sourceSection) {
		throw new Error(`Source section '${sourceSectionId}' not found.`);
	}

	const templateType: CmsTemplateType = sourceSection.content?.templateType || (
		sourceSectionId.startsWith('hero') ? 'hero' :
			sourceSectionId.startsWith('process_flow') ? 'process_flow' :
				sourceSectionId.startsWith('how_it_works') ? 'how_it_works' :
					sourceSectionId.startsWith('about') ? 'about' :
						sourceSectionId.startsWith('contact') ? 'contact' :
							sourceSectionId.startsWith('faqs') ? 'faqs' :
								sourceSectionId.startsWith('footer') ? 'footer' : 'about'
	);

	const newSectionId = `${templateType}_${Date.now()}`;
	const currentName = sourceSection.content?.sectionName || sourceSection.title || 'Section';
	const newSectionName = `${currentName} (Copy)`;
	const newTitle = sourceSection.title;
	const newSubtitle = sourceSection.subtitle || '';

	const newContent = {
		...sourceSection.content,
		templateType,
		sectionName: newSectionName
	};

	await updateCmsSection(targetVerticalId, newSectionId, newTitle, newSubtitle, newContent);

	// Insert into sectionOrder right after sourceSectionId
	const updatedOrder = [...sectionOrder];
	const sourceIdx = updatedOrder.indexOf(sourceSectionId);
	if (sourceIdx !== -1) {
		updatedOrder.splice(sourceIdx + 1, 0, newSectionId);
	} else {
		updatedOrder.push(newSectionId);
	}

	await updateCmsSection(
		targetVerticalId,
		'section_order',
		'Section Order Configuration',
		'Custom section layout order for public intake page',
		{ order: updatedOrder }
	);

	return {
		newSectionId,
		sectionName: newSectionName,
		templateType
	};
}

export async function deleteCmsSection(verticalId: string = 'mmj-dispensary', sectionId: string) {
	const targetVerticalId = (verticalId || 'mmj-dispensary').toLowerCase();
	const compoundId = `${targetVerticalId}__${sectionId}`;

	await db.delete(intakeCms).where(
		or(
			eq(intakeCms.id, compoundId),
			eq(intakeCms.id, sectionId),
			eq(intakeCms.sectionId, sectionId)
		)
	);

	const { sectionOrder } = await getIntakeCmsSections(targetVerticalId);
	const updatedOrder = sectionOrder.filter((id) => id !== sectionId);

await updateCmsSection(
	targetVerticalId,
	'section_order',
	'Section Order Configuration',
	'Custom section layout order for public intake page',
	{ order: updatedOrder }
);

return { success: true };
}
