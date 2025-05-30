import { User } from '../models/users'


export const userSignUP=async(req, res)=>{
try{
  const data= req.body()
  const response= await User.find((email='email') || (password='password'))
  if(!email || password){
    res.send.message("user not found")
  }
  if(isValid=response){
    res.send.message()
  }
}
}