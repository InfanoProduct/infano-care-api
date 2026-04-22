export class SafetyService {
  async getCrisisResources(locale: string = 'en-IN') {
    // In a real app, this might come from a DB table or a CMS
    // For MVP, we'll return the required helplines for the specified locale
    if (locale === 'en-IN') {
      return {
        helplines: [
          {
            id: 'vandrevala',
            name: 'Vandrevala Foundation',
            phone: '9999666555',
            sms: '9999666555',
            hours: '24/7',
            description: 'Free counseling via phone and chat.',
            url: 'https://www.vandrevalafoundation.com/'
          },
          {
            id: 'aasra',
            name: 'AASRA',
            phone: '9820466726',
            hours: '24/7',
            description: 'Suicide prevention and emotional support.',
            url: 'http://www.aasra.info/'
          },
          {
            id: 'eating-disorders',
            name: 'National Alliance for Eating Disorders',
            phone: '8666621235',
            hours: 'Mon-Fri, 9am-7pm EST',
            description: 'Specialized support for eating disorders.',
            url: 'https://www.allianceforeatingdisorders.com/'
          },
          {
            id: 'tiss-icall',
            name: 'TISS iCall',
            phone: '9152987821',
            hours: 'Mon-Sat, 10am-8pm',
            description: 'Psychosocial helpline by TISS Mumbai.',
            url: 'http://icallhelpline.org/'
          }
        ]
      };
    }

    // Default fallback
    return {
      helplines: [
        {
          id: 'vandrevala',
          name: 'Vandrevala Foundation',
          phone: '9999 666 555',
          hours: '24/7',
          url: 'https://www.vandrevalafoundation.com/'
        }
      ]
    };
  }
}
