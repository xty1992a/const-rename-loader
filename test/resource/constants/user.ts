// 用户信息
export const SET_USER_INFO = 'SET_USER_INFO'

// 用户携带的顾问信息
export const SET_USER_SELLER_ID = 'SET_USER_SELLER_ID'

// 用户携带的项目信息
export const SET_USER_PROJECT_ID = 'SET_USER_PROJECT_ID'

// 用户携带的户型信息
export const SET_USER_HOUSE_TYPE_ID = 'SET_USER_HOUSE_TYPE_ID'

// 用户携带的户型信息
export const SET_USER_STATE = 'SET_USER_STATE'

export const GenderObj = {
  1: 'M', // 男生
  2: 'F', // 女生
  3: 'U', // 未知
}

export enum USER_STATE_ENUM {
  NO_PHONE_NUMBER = 1,
  NO_VISIT = 2,
  NO_CONTRACT =3,
  OLD_CUSTOMER = 4,
  BROKER = 5,
}

enum GenderEnum {
  UNKNOW = 'U',
  MALE = 'M',
  FEMALE = 'F',
}

export const GENDER_MAP = {
  [GenderEnum.MALE]: 1,
  [GenderEnum.FEMALE]: 2,
  [GenderEnum.UNKNOW]: 3,
}

export const GENDER_DESC = {
  [GenderEnum.UNKNOW]: '未知',
  [GenderEnum.MALE]: '男',
  [GenderEnum.FEMALE]: '女'
}

export const UPDATE_AUTHORIZE_TOKEN = 'UPDATE_AUTHORIZE_TOKEN'
export const UPDATE_USER_AUTHORIZED_TYPES = 'UPDATE_USER_AUTHORIZED_TYPES'

/** @deprecated */
export const SUBSCRIBE_STORAGE_NAME = 'subscribe_template_ids' // 消息订阅本地缓存名称
