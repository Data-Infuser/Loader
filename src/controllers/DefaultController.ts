import { Request, Response } from "express";

export default class DefaultController {
  static getIndex = async(req: Request, res: Response) => {
    res.json(new ApiResponse("data", []));
  }
}

class ApiResponse {
  message: String = ""
  code: number
  data: any
  error: Error

  constructor(message?: string, data?: any, error?: Error) {
    if(message) this.message = message;
    if(data) this.data = data;
    if(error) this.error = error;
  }

  get json(): {} {
    const json = {}
    if(this.error) {
      json["code"] = "0001";
      json["message"] = this.error.message;
    } else {
      json["data"] = this.data
      json["message"] = this.message
    }
    return json;
  }
}