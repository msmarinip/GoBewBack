const { Router } = require('express');
const { check } = require('express-validator');
const mongoose = require("mongoose");
const User = require('../models/Users');
const { createUser, updateUser, loginUser, loginUserGoogle, loginUserAdmin, renewToken, updateUserActiveState, userActivateCta, userAdminResetPassMail, userResetPassMail, userCheckResetPassword, userChangePassword, userIsGoogleByMail } = require('../controllers/user');
const { validateFields } = require('../middlewares/validateFields');
const { firstNameReq, lastNameReq, idInvalid } = require('../controllers/errMsg');
const { validateJWT } = require('../middlewares/validateJWT');
const { sendEmail } = require('../controllers/sendEmail');
const router = Router();
const ObjectId = mongoose.Types.ObjectId;
router.post(
    '/new',
    [
        check('userEmail', 'El email es obligatorio.').not().isEmpty(),
        check('userEmail', 'El email no es válido.').isEmail(),
        check('userEmail').custom(value => {
            // console.log(1,value)
            return User.find({ userEmail: { $regex: new RegExp('^' + value + '$', "i") } }).then(user => {
                // console.log(1,user)                
                if (user.length > 0) {
                    return Promise.reject('Ya hay un usuario con ese email.');
                }
            });
        }),
        check('userPassword', 'La contraseña es obligatoria.').not().isEmpty(),
        check('userPassword', 'La contraseña debe tener al menos 6 caracteres.')
            .not()
            .isIn(['123456', 'password1', 'god123'])
            .withMessage('No es una constraseña segura')
            .isLength({ min: 6 }),
        // .matches(/\d/),
        check('userFirstName', firstNameReq).not().isEmpty(),
        check('userLastName', lastNameReq).not().isEmpty(),
        validateFields
    ],
    createUser
);
router.post(
    '/newGoogle',
    [
        check('userEmail', 'El email es obligatorio.').not().isEmpty(),
        check('userEmail', 'El email no es válido.').isEmail(),
        check('userEmail').custom(value => {
            return User.find({ userEmail: { $regex: new RegExp(`^${userEmail}$`), $options: 'i' } }).then(user => {
                if (user.length > 0) {
                    return Promise.reject('Ya hay un usuario con ese email.');
                }
            });
        }),
        check('userFirstName', firstNameReq).not().isEmpty(),
        check('userLastName', lastNameReq).not().isEmpty(),
        validateFields
    ],
    createUser
);
router.put(
    '/',
    [
        check('userId').custom(value => {
            return User.findById(value).then(user => {
                if (!user) {
                    return Promise.reject(idInvalid);
                }
            });
        }),
        check('userFirstName', firstNameReq).not().isEmpty(),
        check('userLastName', lastNameReq).not().isEmpty(),
        validateFields
    ],
    updateUser
);
router.put(
    '/isActive',
    [
        check('userId').custom(value => {
            return User.findById(value).then(user => {
                if (!user) {
                    return Promise.reject(idInvalid);
                }
            });
        }),
        check('userIsActive').isBoolean(),
        validateFields
    ],
    updateUserActiveState
);

router.post(
    '/auth',
    [
        check('userEmail', 'El email es obligatorio').isEmail(),
        check('userPassword', 'El password debe tener al menos 6 letras').isLength({ min: 6 }),
        validateFields
    ],
    loginUser
)
router.post(
    '/authGoogle',
    [
        check('userEmail', 'El email es obligatorio').isEmail(),
        // check('userPassword', 'El password debe tener al menos 6 letras').isLength({ min: 6 }),
        validateFields
    ],
    loginUserGoogle
)
router.post(
    '/authAdmin',
    [
        check('userEmail', 'El email es obligatorio').isEmail(),
        check('userPassword', 'El password debe tener al menos 6 letras').isLength({ min: 6 }),
        validateFields
    ],
    loginUserAdmin
)
// router.get('/adminRenew',validateJWT, renewToken);
router.get('/userIsGoogleByMail/:userEmail',  userIsGoogleByMail);

router.get('/renew', validateJWT, renewToken);

router.get('/activate/:userId/:hash/:userEmail', userActivateCta);
router.post('/admin/resetPass', userAdminResetPassMail);
router.post('/resetPass', userResetPassMail);
router.get('/checkResetPass/:userId/:hash/:userEmail', userCheckResetPassword);
router.put('/changePass',[
    check('userId').custom(value => {
        return User.findById(value).then(user => {
            if (!user) {
                return Promise.reject(idInvalid);
            }
        });
    }),
    
    check('userPassword', 'La contraseña es obligatoria.').not().isEmpty(),
    check('userPassword', 'La contraseña debe tener al menos 6 caracteres.')
        .not()
        .isIn(['123456', 'password1', 'god123'])
        .withMessage('No es una constraseña segura')
        .isLength({ min: 6 }),
    check('userEmail', 'El email es obligatorio.').not().isEmpty(),
    check('userEmail', 'El email no es válido.').isEmail(),
    validateFields
], userChangePassword);

router.get('/all', async (req, res) => {
    try {
        const users = await User.find();
        res.json({
            ok: true,
            users
        })
    } catch (error) {
        res.json({
            ok: false,
            msg: 'Error: ' + error
        })
    }

})
router.get('/allByActive/:isActive', async (req, res) => {
    const { isActive } = req.params;
    const userIsActive = isActive === 'true' ? true : false;
    try {
        const users = await User.find({ userIsActive });
        res.json({
            ok: true,
            users
        })
    } catch (error) {
        res.json({
            ok: false,
            msg: 'Error: ' + error
        })
    }

})
router.get('/allByAdmin/:isAdmin', async (req, res) => {
    const { isAdmin } = req.params;
    const userIsAdmin = isAdmin === 'true' ? true : false;
    try {
        const users = await User.find({ userIsAdmin });
        res.json({
            ok: true,
            users
        })
    } catch (error) {
        res.json({
            ok: false,
            msg: 'Error: ' + error
        })
    }

})

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // console.log(userId)
        const user = await User.findById(userId.toString()).select('_id userEmail userIsActive userIsAdmin userCreationDate userIsGoogle userFirstName userLastName userIsSuperAdmin');

        res.status(201).json(user);
    } catch (error) {
        // console.log(error)
        res.status(404).send('No existe un usuario con el id seleccionado')

    }
});

router.get('/byName/:userName', async (req, res) => {
    const { userName } = req.params;
    // console.log(userName)
    try {
        // const user = await User.find({ userFirstName: { $regex: new RegExp(`^${userName}$`, 'i') } });
        const user = await User.find({
            $or: [
                { 'userFirstName': { $regex: '.*' + userName + '.*', '$options': 'i' } },
                { 'userLastName': { $regex: '.*' + userName + '.*', '$options': 'i' } }
            ]
        });
        res.status(201).json(user);

    } catch (error) {
        res.status(404).send('No existe un usuario con el nombre seleccionado')

    }
})

module.exports = router;