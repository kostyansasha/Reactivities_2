using Application.Core;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Profiles
{
    public class ListActivities
    {
        public class Query : IRequest<Result<List<UserActivityDto>>>
        {
            public string Username { get; set; }
            public string Predicate { get; set; }
        }

        public class Handler : IRequestHandler<Query, Result<List<UserActivityDto>>>
        {
            private readonly DataContext _context;
            private readonly IMapper _mapper;

            public Handler(DataContext context, IMapper mapper)
            {
                _mapper = mapper;
                _context = context;
            }

            public async Task<Result<List<UserActivityDto>>> Handle(Query request, CancellationToken cancellationToken)
            {
                if (string.IsNullOrEmpty(request.Username)) return null;

                //In Solution
                //var query = _context.ActivityAttendees
                //.Where(u => u.AppUser.UserName == request.Username)
                //.OrderBy(a => a.Activity.Date)
                //.ProjectTo<UserActivityDto>(_mapper.ConfigurationProvider)
                //.AsQueryable();

                var query = _context.Activities
                     .Where(x => x.Attendees.Any(a => a.AppUser.UserName == request.Username))
                     .OrderBy(d => d.Date)
                     .ProjectTo<UserActivityDto>(_mapper.ConfigurationProvider)
                     .AsQueryable();

                if (request.Predicate == "past")
                {
                    query = query.Where(x => x.Date < DateTime.Now);
                }
                else if (request.Predicate == "hosting")
                {
                    query = query.Where(x => x.HostUsername == request.Username);
                }
                else if (request.Predicate == "future")
                {
                    query = query.Where(x => x.Date >= DateTime.Now);
                }

                return Result<List<UserActivityDto>>.Success(await query.ToListAsync());
            }
        }
    }
}