import User from '../models/User.js'; import { signToken } from '../utils/token.js';
const publicUser=u=>({id:u._id,name:u.name,email:u.email,role:u.role,phone:u.phone});
export async function register(req,res){const {name,email,password,phone}=req.body;if(!name||!email||!password)return res.status(400).json({error:'name, email and password are required'});if(await User.exists({email}))return res.status(409).json({error:'Email already registered'});const user=await User.create({name,email,password,phone});res.status(201).json({token:signToken(user),user:publicUser(user)});}
export async function login(req,res){const user=await User.findOne({email:req.body.email?.toLowerCase()}).select('+password');if(!user||!await user.matchesPassword(req.body.password||''))return res.status(401).json({error:'Invalid email or password'});res.json({token:signToken(user),user:publicUser(user)});}
export async function me(req,res){res.json({user:publicUser(req.user)});}
