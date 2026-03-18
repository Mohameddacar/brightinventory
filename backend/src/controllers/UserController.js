const userService = require('../services/UserServices');
const communicationService = require('../services/CommunicationServices');

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,98}$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{7,20}$/;

const validateUserPayload = (payload, mode = 'create') => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	const name = String(payload.name || '').trim();
	if (!name) {
		errors.push('name is required');
	} else if (!NAME_PATTERN.test(name)) {
		errors.push('name is invalid');
	}

	const email = String(payload.email || '').trim();
	if (!email) {
		errors.push('email is required');
	} else if (!/^\S+@\S+\.\S+$/.test(email)) {
		errors.push('email is invalid');
	}

	if (!payload.role_id || Number(payload.role_id) <= 0) {
		errors.push('role_id is required');
	}

	const phone = String(payload.phone || '').trim();
	if (phone && !PHONE_PATTERN.test(phone)) {
		errors.push('phone is invalid');
	}

	if (mode === 'create') {
		const password = String(payload.password || '');
		if (password.length < 6) {
			errors.push('password must be at least 6 characters');
		}
	} else {
		const password = String(payload.password || '');
		if (password && password.length < 6) {
			errors.push('password must be at least 6 characters');
		}
	}

	if (typeof payload.status !== 'boolean') {
		errors.push('status must be true or false');
	}

	return errors;
};

const createUser = async (req, res) => {
	try {
		const validationErrors = validateUserPayload(req.body, 'create');
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const existingByEmail = await userService.getUserByEmail(req.body.email);
		if (existingByEmail) {
			return res.status(409).json({ message: 'email already exists' });
		}

		const role = await userService.getRoleById(req.body.role_id);
		if (!role) {
			return res.status(400).json({ message: 'role_id is invalid' });
		}

		const plainPassword = String(req.body.password || '');
		await userService.createUser(req.body);

		const roleName = String(role.role_name || 'User');
		let emailSent = false;
		let emailWarning = null;

		if (String(req.body.email || '').trim()) {
			try {
				const loginUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
				const html = `
					<!doctype html>
					<html>
						<head>
							<meta charset="utf-8" />
						</head>
						<body style="margin:0; padding:24px; background:#eef3ff; font-family:Arial, Helvetica, sans-serif;">
							<table style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #dbe6ff;" cellpadding="0" cellspacing="0" width="100%">
								<tr>
									<td style="background:linear-gradient(135deg, #0a2f8a, #2374e1); color:#ffffff; padding:28px 32px;">
										<div style="font-size:34px; font-weight:700; letter-spacing:1px;">Bright MTS</div>
										<div style="opacity:0.95; margin-top:8px; font-size:16px;">Inventory System Account</div>
									</td>
								</tr>
								<tr>
									<td style="padding:28px 32px; color:#1f2937;">
										<p style="margin:0 0 16px 0; font-size:16px;">Hello <strong>${String(req.body.name || '')}</strong>,</p>
										<p style="margin:0 0 20px 0; line-height:1.6; font-size:15px;">Your account has been created successfully with role <strong>${roleName}</strong>. Use the credentials below to login:</p>
										<table style="width:100%; border:1px solid #d1d5db; border-radius:10px; overflow:hidden;" cellpadding="0" cellspacing="0">
											<tr>
												<td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; width:140px; color:#6b7280; font-size:13px;">USERNAME</td>
												<td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-weight:700;">${String(req.body.name || '')}</td>
											</tr>
											<tr>
												<td style="padding:12px 16px; color:#6b7280; font-size:13px;">PASSWORD</td>
												<td style="padding:12px 16px; font-weight:700;">${plainPassword}</td>
											</tr>
										</table>
										<p style="margin:20px 0 0 0; line-height:1.6; font-size:14px;">
											Login URL:
											<a href="${loginUrl}" style="color:#1d4ed8; text-decoration:none;"> ${loginUrl}</a>
										</p>
										<p style="margin:22px 0 0 0; color:#dc2626; font-size:14px;"><strong>Important:</strong> Change your password immediately after first login.</p>
									</td>
								</tr>
							</table>
						</body>
					</html>
				`;

				await communicationService.sendEmail({
					to: String(req.body.email),
					subject: 'Welcome to Bright MTS Inventory - Your Login Credentials',
					html,
					text: `Welcome ${String(req.body.name || '')}. Username: ${String(req.body.name || '')}, Password: ${plainPassword}, Role: ${roleName}`,
				});
				emailSent = true;
			} catch (error) {
				emailWarning = error.message;
			}
		}

		return res.status(201).json({
			message: emailSent ? 'User created and credentials email sent successfully' : 'User created successfully',
			email_sent: emailSent,
			email_warning: emailWarning,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create user', error: error.message });
	}
};

const updateUser = async (req, res) => {
	try {
		const validationErrors = validateUserPayload(req.body, 'update');
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await userService.getUserById(id);
		if (!existing) {
			return res.status(404).json({ message: 'User not found' });
		}

		const existingByEmail = await userService.getUserByEmail(req.body.email);
		if (existingByEmail && Number(existingByEmail.id) !== Number(id)) {
			return res.status(409).json({ message: 'email already exists' });
		}

		const role = await userService.getRoleById(req.body.role_id);
		if (!role) {
			return res.status(400).json({ message: 'role_id is invalid' });
		}

		await userService.updateUser(id, req.body);
		return res.status(200).json({ message: 'User updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update user', error: error.message });
	}
};

const deleteUser = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await userService.getUserById(id);
		if (!existing) {
			return res.status(404).json({ message: 'User not found' });
		}

		await userService.deleteUser(id);
		return res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete user', error: error.message });
	}
};

const getUsers = async (req, res) => {
	try {
		const rows = await userService.getAllUsers();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch user records', error: error.message });
	}
};

const getUser = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await userService.getUserById(id);

		if (!row) {
			return res.status(404).json({ message: 'User not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
	}
};

module.exports = {
	createUser,
	updateUser,
	deleteUser,
	getUsers,
	getUser,
};
