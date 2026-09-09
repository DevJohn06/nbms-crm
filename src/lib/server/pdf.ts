import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from './db/index';
import { contracts, leads } from './db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { uploadToR2 } from './r2';

export interface CreateContractOptions {
	leadId: number;
	clientName: string;
	clientEmail: string;
	servicePackage?: string;
	monthlyFee?: string;
	contractTerms?: string;
	signatureData?: string; // base64 data url
	businessAddress?: string;
	perWithdrawalFee?: string;
	agentShareFee?: string;
	desk3500Qty?: string;
	move5000WifiQty?: string;
	move50004gQty?: string;
	desk1500PinPadQty?: string;
	bankAccountName?: string;
	bankRouting?: string;
	bankAccountNumber?: string;
	bankAccountType?: string;
}

export async function saveContractSubmission(options: CreateContractOptions) {
	const { leadId, clientName, clientEmail, signatureData } = options;
	const servicePackage = options.servicePackage || 'Growth Pro Merchant Package';
	const monthlyFee = options.monthlyFee || '$199 / month';
	const contractTerms = options.contractTerms || 'Debit Processing Merchant Agreement 12-Month Term';

	const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
	if (!lead) {
		throw new Error(`Lead #${leadId} not found`);
	}

	const [existingContract] = await db
		.select()
		.from(contracts)
		.where(eq(contracts.leadId, leadId));

	const now = new Date().toISOString();
	const contractId = existingContract?.id || `PAY-CON-${Math.floor(100000 + Math.random() * 900000)}`;

	const isSigned = Boolean(signatureData || existingContract?.signatureData);
	const status = isSigned ? 'SIGNED' : 'PENDING_SIGNATURE';
	const signedAt = isSigned ? (existingContract?.signedAt || now) : null;

	const [contract] = await db
		.insert(contracts)
		.values({
			id: contractId,
			leadId,
			clientName,
			clientEmail,
			servicePackage,
			monthlyFee,
			contractTerms,
			signatureData: signatureData || existingContract?.signatureData || null,
			status,
			createdAt: now,
			signedAt
		})
		.onConflictDoUpdate({
			target: contracts.id,
			set: {
				clientName,
				clientEmail,
				servicePackage,
				monthlyFee,
				contractTerms,
				signatureData: signatureData || existingContract?.signatureData || null,
				status,
				signedAt
			}
		})
		.returning();

	// Update lead status to CONTRACT_SIGNED if signed, else CONTRACT_SENT
	await db
		.update(leads)
		.set({
			status: isSigned ? 'CONTRACT_SIGNED' : 'CONTRACT_SENT',
			updatedAt: now
		})
		.where(eq(leads.id, leadId));

	return { contract };
}

function drawRunInParagraph(
	page: any,
	title: string,
	body: string,
	y: number,
	fontSize: number,
	leading: number,
	fontBold: any,
	fontRegular: any,
	titleColor: any,
	textColor: any
): number {
	const cleanTitle = title.trim();
	const titleWidth = fontBold.widthOfTextAtSize(cleanTitle, fontSize);
	page.drawText(cleanTitle, { x: 40, y, size: fontSize, font: fontBold, color: titleColor });

	const hGap = 5;
	const firstLineX = 40 + titleWidth + hGap;
	const firstLineMaxW = 532 - titleWidth - hGap;

	const words = body.trim().split(' ');
	let currentLine = '';
	let isFirstLine = true;
	let curY = y;

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const maxW = isFirstLine ? firstLineMaxW : 532;
		const w = fontRegular.widthOfTextAtSize(testLine, fontSize);
		if (w > maxW && currentLine) {
			page.drawText(currentLine, {
				x: isFirstLine ? firstLineX : 40,
				y: curY,
				size: fontSize,
				font: fontRegular,
				color: textColor
			});
			isFirstLine = false;
			curY -= leading;
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}
	if (currentLine) {
		page.drawText(currentLine, {
			x: isFirstLine ? firstLineX : 40,
			y: curY,
			size: fontSize,
			font: fontRegular,
			color: textColor
		});
		curY -= leading;
	}
	return curY;
}

export async function generateContractPdf(optionsOrLeadId: CreateContractOptions | number) {
	let leadId: number;
	let clientName: string;
	let clientEmail: string;
	let servicePackage: string;
	let monthlyFee: string;
	let contractTerms: string;
	let signatureData: string | undefined;

	let customAddress = '';
	let perWithdrawalFee = '$3.50';
	let agentShareFee = '$1.50';
	let desk3500Qty = '1';
	let move5000WifiQty = '0';
	let move50004gQty = '0';
	let desk1500PinPadQty = '1';
	let bankAccountName = '';
	let bankRouting = '';
	let bankAccountNumber = '';
	let bankAccountType = 'Checking';

	if (typeof optionsOrLeadId === 'number') {
		leadId = optionsOrLeadId;
		const [contract] = await db.select().from(contracts).where(eq(contracts.leadId, leadId));
		if (!contract) {
			throw new Error(`No contract submission found for Lead #${leadId}`);
		}
		clientName = contract.clientName;
		clientEmail = contract.clientEmail;
		servicePackage = contract.servicePackage;
		monthlyFee = contract.monthlyFee;
		contractTerms = contract.contractTerms;
		signatureData = contract.signatureData || undefined;
	} else {
		leadId = optionsOrLeadId.leadId;
		clientName = optionsOrLeadId.clientName;
		clientEmail = optionsOrLeadId.clientEmail;
		servicePackage = optionsOrLeadId.servicePackage || 'Growth Pro Merchant Package';
		monthlyFee = optionsOrLeadId.monthlyFee || '$199 / month';
		contractTerms = optionsOrLeadId.contractTerms || 'Debit Processing Merchant Agreement 12-Month Term';
		signatureData = optionsOrLeadId.signatureData;

		if (optionsOrLeadId.businessAddress) customAddress = optionsOrLeadId.businessAddress;
		if (optionsOrLeadId.perWithdrawalFee) perWithdrawalFee = optionsOrLeadId.perWithdrawalFee;
		if (optionsOrLeadId.agentShareFee) agentShareFee = optionsOrLeadId.agentShareFee;
		if (optionsOrLeadId.desk3500Qty) desk3500Qty = optionsOrLeadId.desk3500Qty;
		if (optionsOrLeadId.move5000WifiQty) move5000WifiQty = optionsOrLeadId.move5000WifiQty;
		if (optionsOrLeadId.move50004gQty) move50004gQty = optionsOrLeadId.move50004gQty;
		if (optionsOrLeadId.desk1500PinPadQty) desk1500PinPadQty = optionsOrLeadId.desk1500PinPadQty;
		if (optionsOrLeadId.bankAccountName) bankAccountName = optionsOrLeadId.bankAccountName;
		if (optionsOrLeadId.bankRouting) bankRouting = optionsOrLeadId.bankRouting;
		if (optionsOrLeadId.bankAccountNumber) bankAccountNumber = optionsOrLeadId.bankAccountNumber;
		if (optionsOrLeadId.bankAccountType) bankAccountType = optionsOrLeadId.bankAccountType;
	}

	const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
	if (!lead) {
		throw new Error(`Lead #${leadId} not found`);
	}

	let leadCustomFields: any = {};
	if (lead.customFields) {
		try {
			leadCustomFields = JSON.parse(lead.customFields);
		} catch (e) {}
	}

	const businessName = lead.businessName || 'Merchant Entity';
	const businessAddress = customAddress || leadCustomFields.businessAddress || leadCustomFields.address || 'Location Address On File';
	bankAccountName = bankAccountName || leadCustomFields.bankAccountName || businessName;
	bankRouting = bankRouting || leadCustomFields.bankRouting || '123456789';
	bankAccountNumber = bankAccountNumber || leadCustomFields.bankAccountNumber || '••••••••9876';

	const [existingContract] = await db.select().from(contracts).where(eq(contracts.leadId, leadId));
	const contractId = existingContract?.id || `PAY-CON-${Math.floor(100000 + Math.random() * 900000)}`;

	const pdfDoc = await PDFDocument.create();
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

	// Deep Navy Blue Brand Color Palette
	const brandNavy = rgb(15 / 255, 39 / 255, 68 / 255); // #0F2744 Deep Corporate Navy Blue
	const brandNavyAccent = rgb(27 / 255, 67 / 255, 125 / 255); // #1B437D Rich Navy Blue
	const brandMidnight = rgb(10 / 255, 25 / 255, 47 / 255); // #0A192F Deepest Midnight Navy
	const brandCyan = rgb(2 / 255, 132 / 255, 199 / 255); // #0284C7 Accent Cyan
	const brandText = rgb(30 / 255, 41 / 255, 59 / 255); // #1E293B Crisp Dark Slate Body
	const grayText = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B Muted Slate
	const lightBg = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC Soft Cool Slate Fill
	const cardBg = rgb(241 / 255, 245 / 255, 249 / 255); // #F1F5F9 Slate Card Fill
	const borderSlate = rgb(203 / 255, 213 / 255, 225 / 255); // #CBD5E1 Clean Border
	const pillBg = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0 Subtle Navy-Slate Pill Fill
	const white = rgb(1, 1, 1);
	const successGreen = rgb(16 / 255, 185 / 255, 129 / 255); // #10B981 Emerald

	// Load Payjeezy PNG Logo
	let embeddedLogo: any = null;
	try {
		const logoPath = path.join(process.cwd(), 'static', 'images', 'payjeezy_logo.png');
		const logoBytes = await fs.readFile(logoPath);
		embeddedLogo = await pdfDoc.embedPng(logoBytes);
	} catch (logoErr) {
		console.warn('[PDF Logo Warning] Failed to embed Payjeezy logo from static/images:', logoErr);
	}

	// Embed Signature if present
	let embeddedSigImage: any = null;
	if (signatureData && signatureData.startsWith('data:image/png;base64,')) {
		try {
			const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
			const imageBytes = Buffer.from(base64Data, 'base64');
			embeddedSigImage = await pdfDoc.embedPng(imageBytes);
		} catch (err) {
			console.error('Failed to embed PNG signature image:', err);
		}
	}

	const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	const dayNum = new Date().getDate();
	const monthYearStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

	const drawHeader = (page: any) => {
		const { width, height } = page.getSize();

		// Payjeezy Logo (Left)
		if (embeddedLogo) {
			page.drawImage(embeddedLogo, {
				x: 40,
				y: height - 58,
				width: 76.6,
				height: 36
			});
			page.drawText('MERCHANT SOLUTIONS', {
				x: 40,
				y: height - 68,
				size: 7.5,
				font: fontBold,
				color: brandCyan
			});
		} else {
			page.drawText('PAYJEEZY', {
				x: 40,
				y: height - 48,
				size: 22,
				font: fontBold,
				color: brandNavy
			});
			page.drawText('MERCHANT SOLUTIONS', {
				x: 40,
				y: height - 62,
				size: 8,
				font: fontBold,
				color: brandCyan
			});
		}

		// Header Contact Info Card (Right)
		page.drawRectangle({
			x: width - 262,
			y: height - 64,
			width: 222,
			height: 44,
			color: lightBg,
			borderColor: borderSlate,
			borderWidth: 1
		});
		page.drawText('PAYJEEZY LLC', {
			x: width - 252,
			y: height - 32,
			size: 8.5,
			font: fontBold,
			color: brandNavy
		});
		page.drawText('500 Marquette Ave NW Ste 120, Albuquerque, NM 87102', {
			x: width - 252,
			y: height - 44,
			size: 7.5,
			font: fontRegular,
			color: grayText
		});
		page.drawText('Direct: 888-761-2221  •  support@payjeezy.com', {
			x: width - 252,
			y: height - 56,
			size: 7.5,
			font: fontBold,
			color: brandText
		});

		// Header Accent Dividers in Deep Navy & Cyan
		page.drawLine({
			start: { x: 40, y: height - 76 },
			end: { x: width - 40, y: height - 76 },
			thickness: 1.5,
			color: brandNavy
		});
		page.drawLine({
			start: { x: 40, y: height - 76 },
			end: { x: 135, y: height - 76 },
			thickness: 2.5,
			color: brandCyan
		});
	};

	const drawFooter = (page: any, pageNum: number, includeInitials = true) => {
		const { width } = page.getSize();
		page.drawLine({
			start: { x: 40, y: 44 },
			end: { x: width - 40, y: 44 },
			thickness: 0.75,
			color: borderSlate
		});

		if (includeInitials) {
			page.drawText('Merchant Initial: _________     Payjeezy / PP, LLC: _________', {
				x: 40,
				y: 26,
				size: 8.5,
				font: fontRegular,
				color: grayText
			});
		} else {
			page.drawText('Payjeezy Merchant Processing  •  Confidential', {
				x: 40,
				y: 26,
				size: 8,
				font: fontOblique,
				color: grayText
			});
		}

		// Page Pill Badge (Center)
		page.drawRectangle({
			x: width / 2 - 35,
			y: 19,
			width: 70,
			height: 18,
			color: pillBg,
			borderColor: borderSlate,
			borderWidth: 0.5
		});
		page.drawText(`Page ${pageNum} of 9`, {
			x: width / 2 - 25,
			y: 24,
			size: 8,
			font: fontBold,
			color: brandNavy
		});

		page.drawText('PAYJEEZY LLC', {
			x: width - 110,
			y: 26,
			size: 8,
			font: fontBold,
			color: brandNavy
		});
	};

	// -------------------------------------------------------------
	// PAGE 1: Merchant Document Checklist
	// -------------------------------------------------------------
	const page1 = pdfDoc.addPage([612, 792]);
	drawHeader(page1);

	page1.drawText('Merchant Document Checklist', {
		x: 40,
		y: 686,
		size: 20,
		font: fontBold,
		color: brandNavy
	});
	page1.drawText('Required onboarding and underwriting documentation for processing activation.', {
		x: 40,
		y: 668,
		size: 10,
		font: fontRegular,
		color: grayText
	});

	// Welcoming Guidance Card
	page1.drawRectangle({
		x: 40,
		y: 595,
		width: 532,
		height: 60,
		color: lightBg,
		borderColor: borderSlate,
		borderWidth: 1
	});
	const p1Intro = [
		'Below is the checklist of required documents to activate your point-of-banking debit processing program.',
		'To avoid processing delays, please ensure all information is accurate and fully executed. Incomplete applications',
		'will require supplemental underwriting review before terminal deployment.'
	];
	let p1y = 638;
	for (const line of p1Intro) {
		page1.drawText(line, { x: 55, y: p1y, size: 9.5, font: fontRegular, color: brandText });
		p1y -= 14;
	}

	// 4 Styled Checklist Cards
	const checklistItems = [
		{
			title: 'Application / Merchant Debit Processing Agreement',
			desc: 'Signed copy of this 9-page agreement with authorized signature and initial blocks completed.'
		},
		{
			title: 'Location Form & Terminal Hardware Confirmation',
			desc: 'Verification of physical merchant deployment address and selected terminal quantities (Page 8).'
		},
		{
			title: 'ACH Direct Deposit & Settlement Authorization',
			desc: 'Completed electronic funds settlement and billing authorization form executed on Page 9.'
		},
		{
			title: 'Voided Business Check or Official Bank Letter',
			desc: 'Official voided check or bank confirmation letter showing legal entity name, routing & account numbers.'
		}
	];

	let itemY = 512;
	for (const item of checklistItems) {
		page1.drawRectangle({
			x: 40,
			y: itemY,
			width: 532,
			height: 56,
			color: cardBg,
			borderColor: borderSlate,
			borderWidth: 1
		});

		// Checkmark Badge in Deep Navy
		page1.drawRectangle({
			x: 55,
			y: itemY + 15,
			width: 26,
			height: 26,
			color: brandNavyAccent
		});
		page1.drawText('X', {
			x: 62,
			y: itemY + 21,
			size: 14,
			font: fontBold,
			color: white
		});

		// Title & Subtext
		page1.drawText(item.title, {
			x: 95,
			y: itemY + 34,
			size: 11.5,
			font: fontBold,
			color: brandMidnight
		});
		page1.drawText(item.desc, {
			x: 95,
			y: itemY + 18,
			size: 9,
			font: fontRegular,
			color: grayText
		});

		itemY -= 70;
	}

	// Guidance Callout Alert Box
	page1.drawRectangle({
		x: 40,
		y: 165,
		width: 532,
		height: 55,
		color: pillBg,
		borderColor: brandNavy,
		borderWidth: 1
	});
	page1.drawText('Underwriting Verification Standard:', {
		x: 55,
		y: 198,
		size: 9.5,
		font: fontBold,
		color: brandNavy
	});
	page1.drawText(
		'Bank letters are accepted with legal entity or registered DBA name. Accounts must be active for direct settlement.',
		{ x: 55, y: 184, size: 8.8, font: fontRegular, color: brandText }
	);
	page1.drawText(
		'Please forward all signed files to underwriting@payjeezy.com or your assigned Payjeezy specialist.',
		{ x: 55, y: 172, size: 8.8, font: fontRegular, color: brandText }
	);

	drawFooter(page1, 1, false);

	// -------------------------------------------------------------
	// PAGE 2: Debit Processing Merchant Agreement
	// -------------------------------------------------------------
	const page2 = pdfDoc.addPage([612, 792]);
	drawHeader(page2);

	page2.drawText('Debit Processing Merchant Agreement', {
		x: 40,
		y: 686,
		size: 19,
		font: fontBold,
		color: brandNavy
	});
	page2.drawText('Point of Banking Program & Electronic Funds Transfer Terms', {
		x: 40,
		y: 668,
		size: 10,
		font: fontRegular,
		color: grayText
	});

	// EXECUTIVE DEAL SUMMARY CARD
	page2.drawRectangle({
		x: 40,
		y: 520,
		width: 532,
		height: 135,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});

	// Header Strip in Deep Navy
	page2.drawRectangle({
		x: 40,
		y: 629,
		width: 532,
		height: 26,
		color: brandNavy
	});
	page2.drawText('MERCHANT ACCOUNT & PRICING SPECIFICATION SUMMARY', {
		x: 55,
		y: 638,
		size: 9.5,
		font: fontBold,
		color: white
	});

	// Row 1: Legal Entity & Contract ID
	page2.drawText('Merchant Entity:', { x: 55, y: 610, size: 9, font: fontRegular, color: grayText });
	page2.drawText(businessName, { x: 160, y: 610, size: 10.5, font: fontBold, color: brandMidnight });

	page2.drawText('Contract ID:', { x: 350, y: 610, size: 9, font: fontRegular, color: grayText });
	page2.drawText(contractId, { x: 430, y: 610, size: 10.5, font: fontBold, color: brandNavyAccent });

	// Row 2: Authorized Signer & Date
	page2.drawText('Authorized Signer:', { x: 55, y: 588, size: 9, font: fontRegular, color: grayText });
	page2.drawText(clientName, { x: 160, y: 588, size: 10, font: fontBold, color: brandMidnight });

	page2.drawText('Agreement Date:', { x: 350, y: 588, size: 9, font: fontRegular, color: grayText });
	page2.drawText(todayStr, { x: 430, y: 588, size: 10, font: fontBold, color: brandMidnight });

	// Row 3: Physical Address (Full Width row)
	page2.drawText('Physical Address:', { x: 55, y: 566, size: 9, font: fontRegular, color: grayText });
	page2.drawText(businessAddress, { x: 160, y: 566, size: 10, font: fontBold, color: brandMidnight });

	// Row 4: Fees
	page2.drawText('Per-Withdrawal Fee:', { x: 55, y: 542, size: 9, font: fontRegular, color: grayText });
	page2.drawText(`${perWithdrawalFee} per approved withdrawal`, { x: 160, y: 542, size: 10, font: fontBold, color: brandMidnight });

	page2.drawText('Agent Share:', { x: 350, y: 542, size: 9, font: fontRegular, color: grayText });
	page2.drawText(`${agentShareFee} per transaction`, { x: 430, y: 542, size: 10, font: fontBold, color: brandNavyAccent });

	// Preamble below card
	let p2y = 498;
	const preambleLines = [
		`This Debit Processing Merchant Agreement ("Agreement") is entered into this  ${dayNum}  day of  ${monthYearStr}  by and`,
		`between Prestige Payment, LLC ("PP, LLC"), located at 151 N. Nob Hill Rd. Ste. 129 Plantation, FL 33324 and its agent`,
		`Payjeezy LLC  located at  500 Marquette Avenue NW Suite 120 Albuquerque, NM 87102 , jointly contracting with`,
		`${businessName}  ("Merchant"), located at  ${businessAddress} .`
	];
	for (let i = 0; i < preambleLines.length; i++) {
		const isMerchantLine = i === 3;
		page2.drawText(preambleLines[i], {
			x: 40,
			y: p2y,
			size: 9.2,
			font: isMerchantLine ? fontBold : fontRegular,
			color: isMerchantLine ? brandNavy : brandText
		});
		p2y -= 13;
	}
	p2y -= 8;

	// Section A
	page2.drawText('A. Introduction & Point of Banking Program', {
		x: 40,
		y: p2y,
		size: 10.5,
		font: fontBold,
		color: brandNavy
	});
	p2y -= 15;
	const secAText = [
		'PP, LLC & agent is engaged in the business of processing a Point of Banking Program ("POB Program"). PP, LLC & agent acts as agent',
		'for the payment of cash to consumers approved by the Merchant (all such services collectively being "Merchant Services") and providing',
		'processing services for electronic funds transfer (EFT) activity ("Processing Services") generated from Merchant\'s Point of Sale Device',
		'("Equipment") or any device facilitating EFT activity. Merchant retains PP, LLC & agent for POB Merchant Services at its designated locations.'
	];
	for (const line of secAText) {
		page2.drawText(line, { x: 40, y: p2y, size: 9, font: fontRegular, color: brandText });
		p2y -= 12.5;
	}
	p2y -= 7;

	// Section B
	page2.drawText('B. Processing Services & Surcharge Compensation', {
		x: 40,
		y: p2y,
		size: 10.5,
		font: fontBold,
		color: brandNavy
	});
	p2y -= 15;
	const secBText = [
		'PP, LLC & agent shall provide reasonably necessary processing services to allow Equipment to access networks available in Merchant\'s',
		`region ("Networks"). PP, LLC & agent shall receive  ${perWithdrawalFee}  per approved withdrawal. Agent will receive  ${agentShareFee} .`,
		'Pricing adjustments require 7 days\' advance notice to Merchant. Continued program utilization constitutes acceptance of updated rates.',
		'PP, LLC & agent will contract with a Networks-sponsoring bank ("Settlement Bank") to facilitate processing and daily transfer of funds.',
		'Merchant shall receive via electronic transfer the cash equivalent value of valid cash vouchers honored in accordance with all applicable Rules.'
	];
	for (let j = 0; j < secBText.length; j++) {
		const isFeeLine = j === 1;
		page2.drawText(secBText[j], {
			x: 40,
			y: p2y,
			size: 9,
			font: isFeeLine ? fontBold : fontRegular,
			color: isFeeLine ? brandMidnight : brandText
		});
		p2y -= 12.5;
	}
	p2y -= 7;

	// Section C
	page2.drawText('C. Equipment Use & Cardholder Validation', {
		x: 40,
		y: p2y,
		size: 10.5,
		font: fontBold,
		color: brandNavy
	});
	p2y -= 15;
	const secCText = [
		'All transactions require that a qualified card be swiped or inserted through Equipment and that the cardholder enter their Personal',
		'Identification Number ("PIN") via an external encrypted PIN Pad. Equipment produces a cash voucher for customer redemption.',
		'Merchant shall not complete any transaction that did not result from the proper, authorized use of a valid consumer transaction card.'
	];
	for (const line of secCText) {
		page2.drawText(line, { x: 40, y: p2y, size: 9, font: fontRegular, color: brandText });
		p2y -= 12.5;
	}
	p2y -= 7;

	// Section D
	page2.drawText('D. Merchant Information & Underwriting Review', {
		x: 40,
		y: p2y,
		size: 10.5,
		font: fontBold,
		color: brandNavy
	});
	p2y -= 15;
	const secDText = [
		'Upon receipt of the fully completed Merchant Application, PP, LLC and Payjeezy LLC shall determine whether to approve the application',
		'and provide requested services by investigating and underwriting Merchant using submitted information and financial documentation.'
	];
	for (const line of secDText) {
		page2.drawText(line, { x: 40, y: p2y, size: 9, font: fontRegular, color: brandText });
		p2y -= 12.5;
	}

	drawFooter(page2, 2, true);

	// -------------------------------------------------------------
	// PAGES 3 - 6: Terms & Conditions Body
	// -------------------------------------------------------------
	for (let pNum = 3; pNum <= 6; pNum++) {
		const p = pdfDoc.addPage([612, 792]);
		drawHeader(p);

		let py = 686;
		if (pNum === 3) {
			p.drawText('F. Merchant Representations and Warranties', {
				x: 40,
				y: py,
				size: 14,
				font: fontBold,
				color: brandNavy
			});
			py -= 16;
			p.drawText('Merchant represents and warrants to PP, LLC and Payjeezy LLC:', {
				x: 40,
				y: py,
				size: 9.5,
				font: fontRegular,
				color: grayText
			});
			py -= 20;

			const points = [
				{ title: '1. Accuracy:', body: 'All information contained in the Merchant Application and supporting documents is true and complete.' },
				{ title: '2. Authority:', body: 'MERCHANT has full legal power and authority to execute and perform this Agreement.' },
				{ title: '3. Licensing:', body: 'MERCHANT has all required state, local, and regulatory licenses to conduct its business operations.' },
				{ title: '4. Data Protection:', body: 'MERCHANT complies fully with all applicable consumer data privacy and security regulations.' },
				{ title: '5. Genuine Transactions:', body: 'Each transaction submitted to PP, LLC for processing represents a genuine cardholder transaction.' },
				{ title: '6. Exclusivity:', body: 'Unless notified in writing, no other competing point-of-banking relationship exists at designated locations.' },
				{ title: '7. Authorization:', body: 'MERCHANT continuously represents that all electronic fund transfer entries are authorized by cardholders.' },
				{ title: '8. Security Standards:', body: 'MERCHANT complies with PCI DSS, PA-DSS, and all applicable card brand security requirements.' },
				{ title: '9. Approved Terminals:', body: 'Only Compliant, encrypted, and PP, LLC / Payjeezy approved ATMs/terminals shall be connected.' },
				{ title: '10. Notification of Changes:', body: 'Any material change in Merchant Business or ownership requires immediate written notice.' },
				{ title: '11. Proprietary Platform:', body: 'PP, LLC provides a secure proprietary platform for electronic payment routing and settlement.' },
				{ title: '12. Equipment Connection:', body: 'Payment terminals programmed by PP, LLC / Payjeezy shall be the sole devices connected to network.' }
			];
			for (const pt of points) {
				py = drawRunInParagraph(p, pt.title, pt.body, py, 9.5, 14, fontBold, fontRegular, brandMidnight, brandText);
				py -= 4;
			}
		} else if (pNum === 4) {
			p.drawText('Merchant Covenants & Operational Terms', {
				x: 40,
				y: py,
				size: 14,
				font: fontBold,
				color: brandNavy
			});
			py -= 22;

			const sec4 = [
				{ title: '13. Breach of Exclusivity:', body: 'MERCHANT agrees that connecting unapproved terminals or diverting transactions causes immediate and irreparable harm to PP, LLC and Payjeezy LLC, entitling Processor to liquidated damages and immediate injunctive relief.' },
				{ title: '14. Merchant Bank Account(s):', body: 'MERCHANT designates an active commercial DDA account for daily ACH processing settlements, debits, adjustments, and fees. MERCHANT covenants to maintain sufficient collected funds to cover all obligations.' },
				{ title: '15. Disclaimer of Warranty:', body: 'This Agreement is a commercial services agreement. PP, LLC and Payjeezy LLC make no warranties, express or implied, regarding merchant transaction volumes or customer foot traffic.' },
				{ title: '16. Taxes & Compliance:', body: 'MERCHANT shall be solely responsible for the timely calculation, withholding, reporting, and payment of all applicable federal, state, and local taxes arising from its merchant business operations.' },
				{ title: '17. Confidentiality:', body: 'Both parties shall maintain strict confidentiality regarding platform operations, processing software, pricing schedules, and proprietary underwriting criteria during and following the term.' },
				{ title: '18. No Third-Party Beneficiary:', body: 'This Agreement is entered into solely for the benefit of MERCHANT, PP, LLC, and Payjeezy LLC. No consumer or third party shall acquire any enforceable rights hereunder.' }
			];
			for (const pt of sec4) {
				py = drawRunInParagraph(p, pt.title, pt.body, py, 9.8, 15, fontBold, fontRegular, brandMidnight, brandText);
				py -= 8;
			}
		} else if (pNum === 5) {
			p.drawText('General Provisions & Legal Governance', {
				x: 40,
				y: py,
				size: 14,
				font: fontBold,
				color: brandNavy
			});
			py -= 22;

			const sec5 = [
				{ title: '19. Amendment or Modification:', body: 'Any amendment, waiver, or modification must be executed in writing and approved by authorized corporate officers of PP, LLC and Payjeezy LLC.' },
				{ title: '20. Regulatory Compliance:', body: 'In the event of changes in federal or state statutory rules, Processor may modify operational parameters upon written notice to maintain ongoing banking network compliance.' },
				{ title: '21. Formal Notices:', body: 'All formal notices shall be delivered via certified mail or verified email to registered corporate addresses on file.' },
				{ title: '22. Prohibition of Assignment:', body: 'MERCHANT may not transfer, assign, or delegate its rights or duties without prior written consent from PP, LLC.' },
				{ title: '23. Binding Legal Effect:', body: 'This Agreement binds the respective heirs, executors, legal representatives, and permitted assigns of the parties.' },
				{ title: '24. Governing Law & Venue:', body: 'Governed by and construed under the laws of the State of Florida, with exclusive venue situated in Miami-Dade County courts.' },
				{ title: '25. Attorneys\' Fees:', body: 'In any dispute arising under this Agreement, the prevailing party shall be entitled to recover reasonable attorneys\' fees and court costs.' },
				{ title: '26. Mutual Compliance Covenants:', body: 'The parties covenant to maintain active regulatory compliance and cooperate fully with network sponsoring financial institutions.' },
				{ title: '27. Limitation of Operational Liability:', body: 'Processor and agent shall not be liable for losses caused by Merchant power outages, terminal vandalism, or local internet disruption.' },
				{ title: '28. Initial Term & Effective Date:', body: 'The Initial Term of this Agreement is twelve (12) months, commencing on the date of terminal installation and first active transaction.' }
			];
			for (const pt of sec5) {
				py = drawRunInParagraph(p, pt.title, pt.body, py, 9.4, 14, fontBold, fontRegular, brandMidnight, brandText);
				py -= 5;
			}
		} else if (pNum === 6) {
			p.drawText('Termination & Dispute Resolution', {
				x: 40,
				y: py,
				size: 14,
				font: fontBold,
				color: brandNavy
			});
			py -= 22;

			const sec6 = [
				{ title: '29. Term & Automatic Renewal:', body: 'Following the Initial Term, this Agreement automatically renews for successive one (1) year periods unless either party delivers written notice of non-renewal at least ninety (90) days prior to expiration.' },
				{ title: '30. Early Termination & Liquidated Damages:', body: 'If MERCHANT terminates prior to completion of the initial term without cause, liquidated damages based on projected average monthly transaction volume shall apply to cover underwriting and deployment costs.' },
				{ title: '31. Succession & Transferability:', body: 'All covenants herein run with the business entity and survive any restructuring, provided assignment approval is granted in writing.' },
				{ title: '32. Cumulative Legal Remedies:', body: 'Remedies available to PP, LLC and Payjeezy LLC under this Agreement are cumulative and non-exclusive of legal remedies provided by law.' },
				{ title: '33. Force Majeure Events:', body: 'Neither party shall be held liable for failure or delay caused by acts of God, war, telecommunications network outages, or government mandates.' },
				{ title: '34. Formal Delivery Coordinates:', body: 'Notices to Payjeezy LLC shall be sent to 500 Marquette Avenue NW Suite 120, Albuquerque, NM 87102. Notices to PP, LLC to 151 N. Nob Hill Rd. Suite 129, Plantation, FL 33324.' }
			];
			for (const pt of sec6) {
				py = drawRunInParagraph(p, pt.title, pt.body, py, 9.8, 15, fontBold, fontRegular, brandMidnight, brandText);
				py -= 8;
			}
		}

		drawFooter(p, pNum, true);
	}

	// -------------------------------------------------------------
	// PAGE 7: Execution & Signatures
	// -------------------------------------------------------------
	const page7 = pdfDoc.addPage([612, 792]);
	drawHeader(page7);

	let p7y = 686;
	page7.drawText('Final Agreement Provisions & Execution', {
		x: 40,
		y: p7y,
		size: 14,
		font: fontBold,
		color: brandNavy
	});
	p7y -= 20;

	const sec7Text = [
		'35. Independent Agents: Payjeezy LLC and its sales representatives are independent entities operating under agreement with PP, LLC.',
		'36. Execution in Counterparts: This Agreement may be executed in multiple digital or physical counterparts, each constituting an original.',
		'37. Revenue Disclaimer: PP, LLC and Payjeezy LLC make no representations regarding specific merchant transaction profits or retail volume.',
		'38. Entire Integrated Agreement: This document constitutes the entire agreement between Merchant and PP, LLC / Payjeezy LLC.'
	];
	for (const pt of sec7Text) {
		const parts = pt.split(': ');
		p7y = drawRunInParagraph(page7, parts[0] + ':', parts[1], p7y, 9.2, 13.5, fontBold, fontRegular, brandMidnight, brandText);
		p7y -= 4;
	}

	p7y -= 15;

	// Company Name Highlight Card
	page7.drawRectangle({
		x: 40,
		y: p7y - 34,
		width: 532,
		height: 42,
		color: pillBg,
		borderColor: brandNavy,
		borderWidth: 1
	});
	page7.drawText('COMPANY / LEGAL ENTITY NAME:', {
		x: 55,
		y: p7y - 18,
		size: 9.5,
		font: fontBold,
		color: grayText
	});
	page7.drawText(businessName, {
		x: 240,
		y: p7y - 19,
		size: 12,
		font: fontBold,
		color: brandMidnight
	});

	p7y -= 60;

	// Side-by-Side Signature Panels
	const sigPanelY = p7y - 170;
	const panelWidth = 256;

	// Left Panel: Merchant Authorized Signer
	page7.drawRectangle({
		x: 40,
		y: sigPanelY,
		width: panelWidth,
		height: 200,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});
	page7.drawRectangle({
		x: 40,
		y: sigPanelY + 174,
		width: panelWidth,
		height: 26,
		color: brandNavyAccent
	});
	page7.drawText('MERCHANT AUTHORIZED SIGNER', {
		x: 52,
		y: sigPanelY + 182,
		size: 9,
		font: fontBold,
		color: white
	});

	page7.drawText('Print Name:', { x: 52, y: sigPanelY + 150, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText(clientName, { x: 110, y: sigPanelY + 150, size: 10.5, font: fontBold, color: brandMidnight });

	page7.drawText('Title:', { x: 52, y: sigPanelY + 132, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText('Authorized Principal / Owner', { x: 85, y: sigPanelY + 132, size: 9, font: fontRegular, color: brandText });

	// Signature Graphic or Line
	if (embeddedSigImage) {
		page7.drawImage(embeddedSigImage, {
			x: 52,
			y: sigPanelY + 68,
			width: 140,
			height: 38
		});
		page7.drawText('✓ Electronically Verified & Signed', {
			x: 52,
			y: sigPanelY + 108,
			size: 7.5,
			font: fontBold,
			color: successGreen
		});
	}
	page7.drawLine({
		start: { x: 52, y: sigPanelY + 65 },
		end: { x: 52 + panelWidth - 24, y: sigPanelY + 65 },
		thickness: 1,
		color: brandMidnight
	});
	page7.drawText('Authorized Merchant Signature', {
		x: 52,
		y: sigPanelY + 52,
		size: 8,
		font: fontOblique,
		color: grayText
	});

	page7.drawText('Date:', { x: 52, y: sigPanelY + 26, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText(todayStr, { x: 85, y: sigPanelY + 26, size: 9.5, font: fontBold, color: brandMidnight });

	// Right Panel: Processor / Agent Officer
	page7.drawRectangle({
		x: 316,
		y: sigPanelY,
		width: panelWidth,
		height: 200,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});
	page7.drawRectangle({
		x: 316,
		y: sigPanelY + 174,
		width: panelWidth,
		height: 26,
		color: brandNavy
	});
	page7.drawText('PROCESSOR & AGENT ACCEPTANCE', {
		x: 328,
		y: sigPanelY + 182,
		size: 9,
		font: fontBold,
		color: white
	});

	page7.drawText('Print Name:', { x: 328, y: sigPanelY + 150, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText('PP, LLC Corporate Officer', { x: 386, y: sigPanelY + 150, size: 10.5, font: fontBold, color: brandMidnight });

	page7.drawText('Title:', { x: 328, y: sigPanelY + 132, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText('Corporate Officer / Authorized Agent', { x: 360, y: sigPanelY + 132, size: 9, font: fontRegular, color: brandText });

	page7.drawLine({
		start: { x: 328, y: sigPanelY + 65 },
		end: { x: 328 + panelWidth - 24, y: sigPanelY + 65 },
		thickness: 1,
		color: brandMidnight
	});
	page7.drawText('Authorized Corporate Signature', {
		x: 328,
		y: sigPanelY + 52,
		size: 8,
		font: fontOblique,
		color: grayText
	});

	page7.drawText('Date:', { x: 328, y: sigPanelY + 26, size: 8.5, font: fontRegular, color: grayText });
	page7.drawText(todayStr, { x: 360, y: sigPanelY + 26, size: 9.5, font: fontBold, color: brandMidnight });

	drawFooter(page7, 7, true);

	// -------------------------------------------------------------
	// PAGE 8: Terminal Prices / Specs
	// -------------------------------------------------------------
	const page8 = pdfDoc.addPage([612, 792]);
	drawHeader(page8);

	page8.drawText('Terminal Hardware & Specifications', {
		x: 40,
		y: 686,
		size: 18,
		font: fontBold,
		color: brandNavy
	});
	page8.drawText('Certified, encrypted Point-of-Banking terminals pre-configured for instant deployment.', {
		x: 40,
		y: 668,
		size: 10,
		font: fontRegular,
		color: grayText
	});

	let p8y = 495;

	// Card 1: DESK/3500
	page8.drawRectangle({
		x: 40,
		y: p8y,
		width: 532,
		height: 160,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});

	// Left: Pricing & Quantity
	page8.drawText('$290', { x: 55, y: p8y + 115, size: 22, font: fontBold, color: brandMidnight });
	page8.drawText('Per Terminal Price', { x: 55, y: p8y + 98, size: 8.5, font: fontRegular, color: grayText });

	page8.drawRectangle({
		x: 55,
		y: p8y + 50,
		width: 135,
		height: 32,
		color: brandNavyAccent
	});
	page8.drawText(`Quantity:  ${desk3500Qty}`, {
		x: 68,
		y: p8y + 61,
		size: 11,
		font: fontBold,
		color: white
	});
	page8.drawText('*Includes programming, encryption & shipping.', {
		x: 55,
		y: p8y + 30,
		size: 7.5,
		font: fontRegular,
		color: grayText
	});

	// Right: Specs
	page8.drawText('Ingenico Desk/3500', { x: 215, y: p8y + 120, size: 15, font: fontBold, color: brandNavy });
	page8.drawText('Standard Countertop High-Performance Terminal', {
		x: 215,
		y: p8y + 104,
		size: 10,
		font: fontBold,
		color: brandCyan
	});
	page8.drawLine({ start: { x: 215, y: p8y + 95 }, end: { x: 555, y: p8y + 95 }, thickness: 0.75, color: borderSlate });

	const deskSpecs = [
		'• Built-in ultra-fast thermal receipt printer',
		'• EMV Contact & Contactless / NFC chip compatibility',
		'• Dual Ethernet LAN & High-Speed Wi-Fi connectivity',
		'• 2.8" Crisp QVGA high-contrast color display',
		'• Fully compatible with external Desk 1500 PIN Pad'
	];
	let specY = p8y + 78;
	for (const sp of deskSpecs) {
		page8.drawText(sp, { x: 215, y: specY, size: 9, font: fontRegular, color: brandText });
		specY -= 13;
	}

	p8y -= 175;

	// Card 2: MOVE/5000
	page8.drawRectangle({
		x: 40,
		y: p8y,
		width: 532,
		height: 160,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});

	// Left: Pricing & Quantities
	page8.drawText('$555 / $620', { x: 55, y: p8y + 115, size: 16, font: fontBold, color: brandMidnight });
	page8.drawText('WIFI: $555  |  WIFI + 4G: $620', { x: 55, y: p8y + 98, size: 8, font: fontBold, color: brandNavy });

	page8.drawRectangle({
		x: 55,
		y: p8y + 44,
		width: 140,
		height: 42,
		color: brandNavyAccent
	});
	page8.drawText(`WIFI Qty: ${move5000WifiQty}`, {
		x: 65,
		y: p8y + 68,
		size: 9.5,
		font: fontBold,
		color: white
	});
	page8.drawText(`4G/LTE Qty: ${move50004gQty}`, {
		x: 65,
		y: p8y + 53,
		size: 9.5,
		font: fontBold,
		color: white
	});
	page8.drawText('*Includes SIM provisioning & priority encryption.', {
		x: 55,
		y: p8y + 26,
		size: 7.5,
		font: fontRegular,
		color: grayText
	});

	// Right: Specs
	page8.drawText('Ingenico Move/5000', { x: 215, y: p8y + 120, size: 15, font: fontBold, color: brandNavy });
	page8.drawText('Mobile Wireless Handheld Terminal', {
		x: 215,
		y: p8y + 104,
		size: 10,
		font: fontBold,
		color: brandCyan
	});
	page8.drawLine({ start: { x: 215, y: p8y + 95 }, end: { x: 555, y: p8y + 95 }, thickness: 0.75, color: borderSlate });

	const moveSpecs = [
		'• Portable on-the-go wireless thermal receipt printing',
		'• Full EMV chip, NFC, and Apple Pay / Google Wallet',
		'• Dual 4G/LTE cellular backup + high-range Wi-Fi',
		'• 3.5" Full color capacitive touchscreen display'
	];
	specY = p8y + 78;
	for (const sp of moveSpecs) {
		page8.drawText(sp, { x: 215, y: specY, size: 9, font: fontRegular, color: brandText });
		specY -= 13;
	}

	p8y -= 175;

	// Card 3: DESK 1500 PIN PAD
	page8.drawRectangle({
		x: 40,
		y: p8y,
		width: 532,
		height: 160,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});

	// Left: Pricing & Quantity
	page8.drawText('$225', { x: 55, y: p8y + 115, size: 22, font: fontBold, color: brandMidnight });
	page8.drawText('External PIN Pad Device', { x: 55, y: p8y + 98, size: 8.5, font: fontRegular, color: grayText });

	page8.drawRectangle({
		x: 55,
		y: p8y + 50,
		width: 135,
		height: 32,
		color: brandNavyAccent
	});
	page8.drawText(`Quantity:  ${desk1500PinPadQty}`, {
		x: 68,
		y: p8y + 61,
		size: 11,
		font: fontBold,
		color: white
	});
	page8.drawText('*Includes secure USB interface cable.', {
		x: 55,
		y: p8y + 30,
		size: 7.5,
		font: fontRegular,
		color: grayText
	});

	// Right: Specs
	page8.drawText('Ingenico Desk 1500 PIN Pad', { x: 215, y: p8y + 120, size: 15, font: fontBold, color: brandNavy });
	page8.drawText('Dedicated Customer-Facing PIN Entry Device', {
		x: 215,
		y: p8y + 104,
		size: 10,
		font: fontBold,
		color: brandCyan
	});
	page8.drawLine({ start: { x: 215, y: p8y + 95 }, end: { x: 555, y: p8y + 95 }, thickness: 0.75, color: borderSlate });

	const padSpecs = [
		'• PCI-PTS 5.x certified for highest PIN encryption security',
		'• Seamless plug-and-play USB connection to Desk/3500 base',
		'• Ergonomic backlit keypad with built-in privacy shield',
		'• 2.8" Crisp QVGA color display for customer prompts'
	];
	specY = p8y + 78;
	for (const sp of padSpecs) {
		page8.drawText(sp, { x: 215, y: specY, size: 9, font: fontRegular, color: brandText });
		specY -= 13;
	}

	drawFooter(page8, 8, false);

	// -------------------------------------------------------------
	// PAGE 9: ACH Bank Authorization Form
	// -------------------------------------------------------------
	const page9 = pdfDoc.addPage([612, 792]);
	drawHeader(page9);

	page9.drawText('ACH Bank Authorization Form', {
		x: 40,
		y: 686,
		size: 19,
		font: fontBold,
		color: brandNavy
	});
	page9.drawText('Direct Deposit & Electronic Settlement Agreement', {
		x: 40,
		y: 668,
		size: 10,
		font: fontRegular,
		color: grayText
	});

	// Preamble Card
	page9.drawRectangle({
		x: 40,
		y: 585,
		width: 532,
		height: 72,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});
	const achIntro = [
		'This agreement entered into by and between the parties whose signatures appear below authorizes PP, LLC / Payjeezy LLC',
		'("Processor") to initiate Automated Clearing House (ACH) debit and credit transfers to the designated bank account for',
		'merchant ATM/EFT disbursements, daily settlements, debits, adjustments, and processing service fees.'
	];
	let p9y = 636;
	for (const line of achIntro) {
		page9.drawText(line, { x: 55, y: p9y, size: 9.2, font: fontRegular, color: brandText });
		p9y -= 13.5;
	}

	// BANK ACCOUNT DETAILS TABLE
	page9.drawRectangle({
		x: 40,
		y: 475,
		width: 532,
		height: 95,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});

	// Table Header Row in Deep Navy
	page9.drawRectangle({
		x: 40,
		y: 540,
		width: 532,
		height: 30,
		color: brandNavy
	});
	page9.drawText('Account Name', { x: 52, y: 551, size: 10, font: fontBold, color: white });
	page9.drawText('Routing #', { x: 235, y: 551, size: 10, font: fontBold, color: white });
	page9.drawText('Account #', { x: 345, y: 551, size: 10, font: fontBold, color: white });
	page9.drawText('Account Type', { x: 460, y: 551, size: 10, font: fontBold, color: white });

	// Table Data Row - Dynamic Values in BOLD
	page9.drawText(bankAccountName, { x: 52, y: 505, size: 9.5, font: fontBold, color: brandMidnight });
	page9.drawText(bankRouting, { x: 235, y: 505, size: 10.5, font: fontBold, color: brandMidnight });
	page9.drawText(bankAccountNumber, { x: 345, y: 505, size: 10.5, font: fontBold, color: brandMidnight });
	page9.drawText(bankAccountType, { x: 460, y: 505, size: 9.5, font: fontBold, color: brandMidnight });

	// Proof of Account Notice Alert
	page9.drawRectangle({
		x: 40,
		y: 400,
		width: 532,
		height: 52,
		color: pillBg,
		borderColor: brandNavy,
		borderWidth: 1
	});
	page9.drawText('Mandatory Settlement Account Verification:', {
		x: 55,
		y: 432,
		size: 9.5,
		font: fontBold,
		color: brandNavy
	});
	page9.drawText(
		'Please include a voided business check or bank confirmation letter as proof of valid, active account status.',
		{ x: 55, y: 418, size: 8.8, font: fontRegular, color: brandText }
	);

	// Merchant Banking Authorization Card
	page9.drawRectangle({
		x: 40,
		y: 135,
		width: 532,
		height: 240,
		color: cardBg,
		borderColor: borderSlate,
		borderWidth: 1
	});
	page9.drawRectangle({
		x: 40,
		y: 349,
		width: 532,
		height: 26,
		color: brandNavy
	});
	page9.drawText('MERCHANT BANKING AUTHORIZATION & SIGNATURE', {
		x: 55,
		y: 357,
		size: 9.5,
		font: fontBold,
		color: white
	});

	page9.drawText('Authorized Signer Name:', { x: 55, y: 318, size: 9.5, font: fontRegular, color: grayText });
	page9.drawText(clientName, { x: 205, y: 318, size: 11.5, font: fontBold, color: brandMidnight });

	// Signature Area
	if (embeddedSigImage) {
		page9.drawImage(embeddedSigImage, {
			x: 55,
			y: 220,
			width: 140,
			height: 40
		});
		page9.drawText('✓ Electronic Signature Verified', {
			x: 55,
			y: 265,
			size: 8,
			font: fontBold,
			color: successGreen
		});
	}
	page9.drawLine({ start: { x: 55, y: 215 }, end: { x: 350, y: 215 }, thickness: 1.2, color: brandMidnight });
	page9.drawText('Authorized Merchant Signature', { x: 55, y: 202, size: 8.5, font: fontOblique, color: grayText });

	page9.drawText('Authorization Date:', { x: 55, y: 165, size: 9.5, font: fontRegular, color: grayText });
	page9.drawText(todayStr, { x: 205, y: 165, size: 11, font: fontBold, color: brandMidnight });

	drawFooter(page9, 9, false);

	const pdfBytes = await pdfDoc.save();

	// Ensure output directory exists
	const storageDir = path.join(process.cwd(), 'static', 'contracts');
	await fs.mkdir(storageDir, { recursive: true });

	const fileName = `${contractId}.pdf`;
	const filePath = path.join(storageDir, fileName);
	await fs.writeFile(filePath, pdfBytes);

	let publicPdfUrl = `/contracts/${fileName}`;
	try {
		const r2Result = await uploadToR2({
			key: `contracts/${fileName}`,
			body: Buffer.from(pdfBytes),
			contentType: 'application/pdf'
		});
		if (r2Result.url) {
			publicPdfUrl = r2Result.url;
		}
	} catch (r2Err) {
		console.warn('[R2 Contract Upload Warning] R2 credentials not set or upload failed, using local storage fallback:', r2Err);
	}

	const now = new Date().toISOString();
	const isSigned = Boolean(signatureData || existingContract?.signatureData);
	const status = isSigned ? 'SIGNED' : 'PENDING_SIGNATURE';
	const signedAt = isSigned ? (existingContract?.signedAt || now) : null;

	// Save or update contract record in database
	const [updatedContract] = await db
		.insert(contracts)
		.values({
			id: contractId,
			leadId,
			clientName,
			clientEmail,
			servicePackage,
			monthlyFee,
			contractTerms,
			signatureData: signatureData || existingContract?.signatureData || null,
			pdfPath: publicPdfUrl,
			status,
			createdAt: now,
			signedAt
		})
		.onConflictDoUpdate({
			target: contracts.id,
			set: {
				clientName,
				clientEmail,
				servicePackage,
				monthlyFee,
				contractTerms,
				signatureData: signatureData || existingContract?.signatureData || null,
				pdfPath: publicPdfUrl,
				status,
				signedAt
			}
		})
		.returning();

	// Update lead status to CONTRACT_SIGNED if signed, or CONTRACT_SENT if pending signature
	await db
		.update(leads)
		.set({
			status: isSigned ? 'CONTRACT_SIGNED' : 'CONTRACT_SENT',
			updatedAt: now
		})
		.where(eq(leads.id, leadId));

	return { contract: updatedContract, pdfBytes, pdfUrl: publicPdfUrl };
}
