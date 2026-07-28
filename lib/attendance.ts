export type AttendanceReward = {
  water: number;
  reward: string;
};


export const attendanceRewards: Record<
  number,
  AttendanceReward
> = {

  1: {
    water: 10,
    reward: "",
  },


  2: {
    water: 20,
    reward: "",
  },


  3: {
    water: 50,
    reward: "",
  },


  5: {
    water: 80,
    reward: "",
  },


  7: {
    water: 100,
    reward: "물방울 300획득",
  },


  14: {
    water: 150,
    reward: "LEVEL1 보상교환권",
  },


  30: {
    water: 0,
    reward: "LEVEL2 보상교환권",
  },

};