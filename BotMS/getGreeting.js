const random = array => { return array[Math.floor(Math.random() * array.length)] }

const getGreetings = () => {
  const answers = [
    'Hello! How can I help you today',
    'Hey, nice to see you. How can I help you?',
    'Welcome back! How can I help you?',
    'Hi, how can I help you?',
    'Hey, do you want to share or talk with me about something',
  ]
  return random(answers)
}

module.exports = getGreetings